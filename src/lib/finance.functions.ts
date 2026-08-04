/**
 * Finance control plane — server functions for the owner/admin panel.
 *
 * Role model:
 *   read  → owner | super_admin | admin
 *   write → owner | super_admin  (money-affecting actions)
 * Every write records a row in financial_audit_log.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const READ_ROLES = ["owner", "super_admin", "admin"];
const WRITE_ROLES = ["owner", "super_admin"];

async function assertRole(supabase: any, userId: string, roles: string[]) {
  const { data, error } = await supabase.rpc("has_any_role", { _user_id: userId, _roles: roles });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden — insufficient clearance");
  return true;
}

async function finAudit(
  actor: string,
  action: string,
  target_kind: string | null,
  target_id: string | null,
  before_state: unknown = null,
  after_state: unknown = null,
) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("financial_audit_log").insert({
      actor_id: actor,
      action,
      target_kind,
      target_id,
      before_state: (before_state as any) ?? null,
      after_state: (after_state as any) ?? null,
    });
  } catch (e) {
    console.error("[finance audit] failed", e);
  }
}

// ─────────────────────────────────────────────────────────── access
export const checkFinanceAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: canRead }, { data: canWrite }] = await Promise.all([
      context.supabase.rpc("has_any_role", { _user_id: context.userId, _roles: READ_ROLES as any }),
      context.supabase.rpc("has_any_role", {
        _user_id: context.userId,
        _roles: WRITE_ROLES as any,
      }),
    ]);
    return { canRead: !!canRead, canWrite: !!canWrite };
  });

// ─────────────────────────────────────────────────────────── dashboard
export const getRevenueOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) =>
    z.object({ days: z.number().int().min(7).max(365).default(30) }).parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context.supabase, context.userId, READ_ROLES);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since = new Date(Date.now() - data.days * 86_400_000).toISOString();
    const { data: rows, error } = await supabaseAdmin
      .from("transactions")
      .select(
        "gross_cents, platform_fee_cents, net_cents, refunded_cents, status, currency, created_at, kind",
      )
      .gte("created_at", new Date(Date.now() - 400 * 86_400_000).toISOString())
      .order("created_at", { ascending: true })
      .limit(50_000);
    if (error) throw new Error(error.message);

    const all = (rows ?? []) as any[];
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

    const ok = all.filter((r) => r.status === "succeeded" || r.status === "partially_refunded");
    const sum = (list: any[], f: (r: any) => number) => list.reduce((a, r) => a + f(r), 0);
    const since_ = (iso: string) => ok.filter((r) => r.created_at >= iso);

    const counts = {
      succeeded: all.filter((r) => r.status === "succeeded").length,
      pending: all.filter((r) => r.status === "pending").length,
      failed: all.filter((r) => r.status === "failed").length,
      refunded: all.filter((r) => r.status === "refunded" || r.status === "partially_refunded")
        .length,
      cancelled: all.filter((r) => r.status === "cancelled").length,
    };

    // Daily series over the requested window.
    const series: { day: string; gross: number; fees: number; count: number }[] = [];
    const byDay = new Map<string, { gross: number; fees: number; count: number }>();
    for (const r of ok) {
      if (r.created_at < since) continue;
      const day = r.created_at.slice(0, 10);
      const cur = byDay.get(day) ?? { gross: 0, fees: 0, count: 0 };
      cur.gross += r.gross_cents;
      cur.fees += r.platform_fee_cents;
      cur.count += 1;
      byDay.set(day, cur);
    }
    for (let i = data.days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      series.push({ day: d, ...(byDay.get(d) ?? { gross: 0, fees: 0, count: 0 }) });
    }

    const byKind = Object.entries(
      ok.reduce<Record<string, { gross: number; fees: number; count: number }>>((acc, r) => {
        acc[r.kind] ??= { gross: 0, fees: 0, count: 0 };
        acc[r.kind].gross += r.gross_cents;
        acc[r.kind].fees += r.platform_fee_cents;
        acc[r.kind].count += 1;
        return acc;
      }, {}),
    ).map(([kind, v]) => ({ kind, ...v }));

    const totalFees = sum(ok, (r) => r.platform_fee_cents);
    const totalGross = sum(ok, (r) => r.gross_cents);

    const { data: pendingPayouts } = await supabaseAdmin
      .from("payouts")
      .select("amount_cents")
      .in("status", ["scheduled", "processing"]);

    return {
      currency: "USD",
      totals: {
        gmv_cents: totalGross,
        commission_cents: totalFees,
        net_to_sellers_cents: sum(ok, (r) => r.net_cents),
        refunded_cents: sum(all, (r) => r.refunded_cents),
        transactions: ok.length,
        avg_commission_cents: ok.length ? Math.round(totalFees / ok.length) : 0,
        effective_take_bps: totalGross ? Math.round((totalFees / totalGross) * 10_000) : 0,
        payouts_pending_cents: ((pendingPayouts ?? []) as any[]).reduce(
          (a, p) => a + p.amount_cents,
          0,
        ),
      },
      today: {
        gmv_cents: sum(since_(startOfDay), (r) => r.gross_cents),
        commission_cents: sum(since_(startOfDay), (r) => r.platform_fee_cents),
        transactions: since_(startOfDay).length,
      },
      month: {
        gmv_cents: sum(since_(startOfMonth), (r) => r.gross_cents),
        commission_cents: sum(since_(startOfMonth), (r) => r.platform_fee_cents),
        transactions: since_(startOfMonth).length,
      },
      year: {
        gmv_cents: sum(since_(startOfYear), (r) => r.gross_cents),
        commission_cents: sum(since_(startOfYear), (r) => r.platform_fee_cents),
        transactions: since_(startOfYear).length,
      },
      counts,
      series,
      byKind,
      generatedAt: new Date().toISOString(),
    };
  });

// ─────────────────────────────────────────────────────────── fee rules
export const listFeeRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertRole(context.supabase, context.userId, READ_ROLES);
    const { data, error } = await context.supabase
      .from("fee_rules")
      .select("*")
      .order("kind", { ascending: true })
      .order("priority", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const feeRuleInput = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(2).max(120),
  kind: z.enum(["order", "tip", "creator_subscription", "plan", "ad", "other"]),
  scope: z.enum(["default", "category", "seller", "seller_type", "country", "promo"]),
  scope_value: z.string().trim().max(200).nullable().optional(),
  percent_bps: z.number().int().min(0).max(10_000),
  fixed_cents: z.number().int().min(0).max(1_000_000),
  min_fee_cents: z.number().int().min(0).max(1_000_000),
  max_fee_cents: z.number().int().min(0).max(10_000_000).nullable().optional(),
  currency: z.string().trim().length(3).nullable().optional(),
  priority: z.number().int().min(0).max(1000).default(0),
  starts_at: z.string().datetime().nullable().optional(),
  ends_at: z.string().datetime().nullable().optional(),
  is_active: z.boolean().default(true),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const upsertFeeRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => feeRuleInput.parse(raw))
  .handler(async ({ data, context }) => {
    await assertRole(context.supabase, context.userId, WRITE_ROLES);
    if (data.scope !== "default" && !data.scope_value)
      throw new Error("This scope requires a target value");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let before: unknown = null;
    if (data.id) {
      const { data: prev } = await supabaseAdmin
        .from("fee_rules")
        .select("*")
        .eq("id", data.id)
        .maybeSingle();
      before = prev;
    }

    const payload = { ...data, created_by: context.userId };
    const { data: row, error } = await supabaseAdmin
      .from("fee_rules")
      .upsert(payload as any)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await finAudit(
      context.userId,
      data.id ? "fee_rule.update" : "fee_rule.create",
      "fee_rule",
      (row as any).id,
      before,
      row,
    );
    return row;
  });

export const deleteFeeRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertRole(context.supabase, context.userId, WRITE_ROLES);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: before } = await supabaseAdmin
      .from("fee_rules")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if ((before as any)?.scope === "default")
      throw new Error("Default rules can be edited but not deleted");
    const { error } = await supabaseAdmin.from("fee_rules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await finAudit(context.userId, "fee_rule.delete", "fee_rule", data.id, before, null);
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────── payment config
export const getPaymentConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertRole(context.supabase, context.userId, READ_ROLES);
    const { data, error } = await context.supabase
      .from("payment_config")
      .select("key, value, description")
      .order("key");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setPaymentConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) =>
    z.object({ key: z.string().min(1).max(60), value: z.any() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context.supabase, context.userId, WRITE_ROLES);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: before } = await supabaseAdmin
      .from("payment_config")
      .select("*")
      .eq("key", data.key)
      .maybeSingle();
    const { data: row, error } = await supabaseAdmin
      .from("payment_config")
      .upsert({
        key: data.key,
        value: data.value,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      } as any)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await finAudit(context.userId, "payment_config.update", "payment_config", null, before, row);
    return row;
  });

// ─────────────────────────────────────────────────────────── transactions
export const listTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) =>
    z
      .object({
        q: z.string().trim().max(120).optional(),
        status: z.string().optional(),
        kind: z.string().optional(),
        method: z.string().optional(),
        seller_id: z.string().uuid().optional(),
        buyer_id: z.string().uuid().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        limit: z.number().int().min(1).max(500).default(100),
        offset: z.number().int().min(0).default(0),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context.supabase, context.userId, READ_ROLES);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("transactions")
      .select(
        "id, kind, status, currency, gross_cents, platform_fee_cents, net_cents, refunded_cents, provider, provider_ref, payment_method, category, country, created_at, buyer_id, seller_id",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);

    if (data.status) q = q.eq("status", data.status as any);
    if (data.kind) q = q.eq("kind", data.kind as any);
    if (data.method) q = q.eq("payment_method", data.method);
    if (data.seller_id) q = q.eq("seller_id", data.seller_id);
    if (data.buyer_id) q = q.eq("buyer_id", data.buyer_id);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    if (data.q) q = q.or(`provider_ref.ilike.%${data.q}%,category.ilike.%${data.q}%`);

    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);

    const ids = Array.from(
      new Set(((rows ?? []) as any[]).flatMap((r) => [r.buyer_id, r.seller_id]).filter(Boolean)),
    );
    const names: Record<string, string> = {};
    if (ids.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name")
        .in("id", ids);
      for (const p of (profs ?? []) as any[]) names[p.id] = p.display_name ?? "—";
    }

    return {
      rows: ((rows ?? []) as any[]).map((r) => ({
        ...r,
        buyer_name: r.buyer_id ? (names[r.buyer_id] ?? "—") : null,
        seller_name: r.seller_id ? (names[r.seller_id] ?? "—") : null,
      })),
      total: count ?? 0,
    };
  });

export const getTransactionDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertRole(context.supabase, context.userId, READ_ROLES);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: txn }, { data: ledger }, { data: refunds }] = await Promise.all([
      supabaseAdmin.from("transactions").select("*").eq("id", data.id).maybeSingle(),
      supabaseAdmin
        .from("ledger_entries")
        .select("*")
        .eq("transaction_id", data.id)
        .order("created_at"),
      supabaseAdmin.from("refunds").select("*").eq("transaction_id", data.id).order("created_at"),
    ]);
    if (!txn) throw new Error("Transaction not found");
    return { transaction: txn, ledger: ledger ?? [], refunds: refunds ?? [] };
  });

export const refundTransactionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) =>
    z
      .object({
        transaction_id: z.string().uuid(),
        amount_cents: z.number().int().min(1).optional(),
        reason: z.string().trim().max(300).optional(),
        reclaim_commission: z.boolean().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context.supabase, context.userId, WRITE_ROLES);
    const { refundTransaction } = await import("@/lib/finance.server");
    const res = await refundTransaction({ ...data, actor_id: context.userId });
    await finAudit(
      context.userId,
      "transaction.refund",
      "transaction",
      data.transaction_id,
      null,
      res,
    );
    return res;
  });

export const cancelTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) =>
    z.object({ id: z.string().uuid(), reason: z.string().max(300).optional() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context.supabase, context.userId, WRITE_ROLES);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: before } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!before) throw new Error("Transaction not found");
    if ((before as any).status !== "pending")
      throw new Error("Only pending transactions can be cancelled");
    const { error } = await supabaseAdmin
      .from("transactions")
      .update({ status: "cancelled" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await finAudit(context.userId, "transaction.cancel", "transaction", data.id, before, {
      reason: data.reason,
    });
    return { ok: true };
  });

export const adjustCommission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        platform_fee_cents: z.number().int().min(0),
        reason: z.string().max(300),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context.supabase, context.userId, WRITE_ROLES);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: before } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!before) throw new Error("Transaction not found");
    const t = before as any;
    if (data.platform_fee_cents > t.gross_cents)
      throw new Error("Commission cannot exceed the gross amount");

    const delta = data.platform_fee_cents - t.platform_fee_cents;
    const { error } = await supabaseAdmin
      .from("transactions")
      .update({
        platform_fee_cents: data.platform_fee_cents,
        net_cents: t.gross_cents - data.platform_fee_cents,
        fee_bps: t.gross_cents ? Math.round((data.platform_fee_cents / t.gross_cents) * 10_000) : 0,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    // Balancing ledger lines so the books still reconcile.
    if (delta !== 0) {
      await supabaseAdmin.from("ledger_entries").insert([
        {
          transaction_id: t.id,
          account: "platform_revenue",
          direction: delta > 0 ? "credit" : "debit",
          amount_cents: Math.abs(delta),
          currency: t.currency,
          memo: `Manual adjustment: ${data.reason}`,
        },
        {
          transaction_id: t.id,
          account: "seller_payable",
          direction: delta > 0 ? "debit" : "credit",
          amount_cents: Math.abs(delta),
          currency: t.currency,
          party_id: t.seller_id,
          memo: `Manual adjustment: ${data.reason}`,
        },
      ] as any);
    }

    await finAudit(
      context.userId,
      "transaction.adjust_commission",
      "transaction",
      data.id,
      before,
      {
        platform_fee_cents: data.platform_fee_cents,
        reason: data.reason,
      },
    );
    return { ok: true, delta_cents: delta };
  });

// ─────────────────────────────────────────────────────────── sellers
export const listSellerFinance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) =>
    z.object({ q: z.string().trim().max(80).optional() }).parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context.supabase, context.userId, READ_ROLES);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: txns } = await supabaseAdmin
      .from("transactions")
      .select("seller_id, gross_cents, platform_fee_cents, net_cents, status")
      .not("seller_id", "is", null)
      .limit(50_000);

    const agg = new Map<string, { gross: number; fees: number; net: number; sales: number }>();
    for (const t of ((txns ?? []) as any[]).filter(
      (t) => t.status === "succeeded" || t.status === "partially_refunded",
    )) {
      const cur = agg.get(t.seller_id) ?? { gross: 0, fees: 0, net: 0, sales: 0 };
      cur.gross += t.gross_cents;
      cur.fees += t.platform_fee_cents;
      cur.net += t.net_cents;
      cur.sales += 1;
      agg.set(t.seller_id, cur);
    }
    const ids = Array.from(agg.keys());
    if (!ids.length) return [];

    const [{ data: profs }, { data: settings }, { data: payouts }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, display_name, handle").in("id", ids),
      supabaseAdmin.from("seller_finance_settings").select("*").in("seller_id", ids),
      supabaseAdmin.from("payouts").select("seller_id, amount_cents, status").in("seller_id", ids),
    ]);

    const settingsBy = new Map(((settings ?? []) as any[]).map((s) => [s.seller_id, s]));
    const paidBy = new Map<string, number>();
    for (const p of (payouts ?? []) as any[]) {
      if (["scheduled", "processing", "paid"].includes(p.status))
        paidBy.set(p.seller_id, (paidBy.get(p.seller_id) ?? 0) + p.amount_cents);
    }

    const rows = ((profs ?? []) as any[]).map((p) => {
      const a = agg.get(p.id)!;
      const s = settingsBy.get(p.id);
      return {
        seller_id: p.id,
        display_name: p.display_name ?? "—",
        handle: p.handle ?? null,
        sales: a.sales,
        gross_cents: a.gross,
        commission_cents: a.fees,
        net_cents: a.net,
        balance_cents: Math.max(0, a.net - (paidBy.get(p.id) ?? 0)),
        approved: s?.approved ?? false,
        suspended: s?.suspended ?? false,
        seller_type: s?.seller_type ?? "standard",
        min_withdrawal_cents: s?.min_withdrawal_cents ?? 2500,
        payout_schedule: s?.payout_schedule ?? "weekly",
      };
    });

    const q = data.q?.toLowerCase();
    return q
      ? rows.filter(
          (r) =>
            r.display_name.toLowerCase().includes(q) || (r.handle ?? "").toLowerCase().includes(q),
        )
      : rows;
  });

export const updateSellerFinance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) =>
    z
      .object({
        seller_id: z.string().uuid(),
        approved: z.boolean().optional(),
        suspended: z.boolean().optional(),
        seller_type: z.string().trim().max(40).optional(),
        min_withdrawal_cents: z.number().int().min(0).max(10_000_000).optional(),
        max_withdrawal_cents: z.number().int().min(0).max(100_000_000).nullable().optional(),
        payout_schedule: z.enum(["daily", "weekly", "biweekly", "monthly", "manual"]).optional(),
        notes: z.string().trim().max(500).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context.supabase, context.userId, WRITE_ROLES);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: before } = await supabaseAdmin
      .from("seller_finance_settings")
      .select("*")
      .eq("seller_id", data.seller_id)
      .maybeSingle();
    const { data: row, error } = await supabaseAdmin
      .from("seller_finance_settings")
      .upsert({ ...data } as any)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await finAudit(context.userId, "seller_finance.update", "seller", data.seller_id, before, row);
    return row;
  });

// ─────────────────────────────────────────────────────────── buyers
export const listBuyerFinance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) =>
    z.object({ q: z.string().trim().max(80).optional() }).parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context.supabase, context.userId, READ_ROLES);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: txns } = await supabaseAdmin
      .from("transactions")
      .select("buyer_id, gross_cents, refunded_cents, status, created_at")
      .not("buyer_id", "is", null)
      .limit(50_000);

    const agg = new Map<
      string,
      { spent: number; refunded: number; orders: number; last: string }
    >();
    for (const t of (txns ?? []) as any[]) {
      const cur = agg.get(t.buyer_id) ?? { spent: 0, refunded: 0, orders: 0, last: t.created_at };
      if (t.status === "succeeded" || t.status === "partially_refunded") {
        cur.spent += t.gross_cents;
        cur.orders += 1;
      }
      cur.refunded += t.refunded_cents;
      if (t.created_at > cur.last) cur.last = t.created_at;
      agg.set(t.buyer_id, cur);
    }
    const ids = Array.from(agg.keys());
    if (!ids.length) return [];
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, handle")
      .in("id", ids);
    const rows = ((profs ?? []) as any[]).map((p) => ({
      buyer_id: p.id,
      display_name: p.display_name ?? "—",
      handle: p.handle ?? null,
      ...agg.get(p.id)!,
    }));
    const q = data.q?.toLowerCase();
    return q
      ? rows.filter(
          (r) =>
            r.display_name.toLowerCase().includes(q) || (r.handle ?? "").toLowerCase().includes(q),
        )
      : rows;
  });

// ─────────────────────────────────────────────────────────── payouts
export const listPayouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertRole(context.supabase, context.userId, READ_ROLES);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("payouts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const runPayoutsNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertRole(context.supabase, context.userId, WRITE_ROLES);
    const { runPayoutBatch } = await import("@/lib/finance.server");
    const res = await runPayoutBatch();
    await finAudit(context.userId, "payouts.run_batch", "payout_batch", res.batch_id, null, res);
    return res;
  });

export const markPayoutPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["paid", "failed", "cancelled"]),
        note: z.string().max(200).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context.supabase, context.userId, WRITE_ROLES);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("payouts")
      .update({
        status: data.status,
        paid_at: data.status === "paid" ? new Date().toISOString() : null,
        failure_reason: data.status === "failed" ? (data.note ?? "Unspecified") : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await finAudit(context.userId, `payout.${data.status}`, "payout", data.id, null, data);
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────── seller self-view
export const getMyFinanceSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: txns } = await context.supabase
      .from("transactions")
      .select("id, kind, status, currency, gross_cents, platform_fee_cents, net_cents, created_at")
      .eq("seller_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    const { data: payouts } = await context.supabase
      .from("payouts")
      .select("id, amount_cents, currency, status, scheduled_for, paid_at")
      .eq("seller_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);

    const ok = ((txns ?? []) as any[]).filter(
      (t) => t.status === "succeeded" || t.status === "partially_refunded",
    );
    const net = ok.reduce((a, t) => a + t.net_cents, 0);
    const claimed = ((payouts ?? []) as any[])
      .filter((p) => ["scheduled", "processing", "paid"].includes(p.status))
      .reduce((a, p) => a + p.amount_cents, 0);

    return {
      sales: ok.length,
      gross_cents: ok.reduce((a, t) => a + t.gross_cents, 0),
      commission_cents: ok.reduce((a, t) => a + t.platform_fee_cents, 0),
      net_cents: net,
      balance_cents: Math.max(0, net - claimed),
      transactions: txns ?? [],
      payouts: payouts ?? [],
    };
  });

// ─────────────────────────────────────────────────────────── audit
export const listFinancialAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertRole(context.supabase, context.userId, READ_ROLES);
    const { data, error } = await context.supabase
      .from("financial_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
