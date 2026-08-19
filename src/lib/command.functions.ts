/**
 * ZOMBIEREX MISSION CONTROL — Super Admin Command Center server functions.
 *
 * Every handler:
 *   1. requireSupabaseAuth  → validates the caller's session (bearer token)
 *   2. assertScope(scope)   → server-side authorization via has_admin_scope()
 *   3. audit()              → writes owner_audit_log with before/after state
 *
 * Authorization is NEVER a frontend concern: the RLS policies on every
 * command-center table also gate on has_admin_scope(), so a manipulated
 * client request cannot reach the data.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ─────────────────────────── helpers ───────────────────────────

async function assertScope(supabase: any, userId: string, scope: string) {
  const { data, error } = await supabase.rpc("has_admin_scope", {
    _user: userId,
    _scope: scope,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Forbidden — missing '${scope}' clearance`);
}

async function audit(
  supabase: any,
  actor: string,
  action: string,
  target_type: string | null,
  target_id: string | null,
  before_value: unknown = null,
  after_value: unknown = null,
) {
  try {
    await supabase.from("owner_audit_log").insert({
      actor_id: actor,
      action,
      target_type,
      target_id,
      before_value: (before_value as any) ?? null,
      after_value: (after_value as any) ?? null,
    });
  } catch (e) {
    console.error("[command audit] failed", e);
  }
}

function rangeStart(range: string): string {
  const now = new Date();
  const d = new Date(now);
  switch (range) {
    case "today":
      d.setUTCHours(0, 0, 0, 0);
      break;
    case "yesterday":
      d.setUTCDate(d.getUTCDate() - 1);
      d.setUTCHours(0, 0, 0, 0);
      break;
    case "7d":
      d.setUTCDate(d.getUTCDate() - 7);
      break;
    case "30d":
      d.setUTCDate(d.getUTCDate() - 30);
      break;
    case "month":
      d.setUTCDate(1);
      d.setUTCHours(0, 0, 0, 0);
      break;
    case "year":
      d.setUTCMonth(0, 1);
      d.setUTCHours(0, 0, 0, 0);
      break;
    default:
      d.setUTCDate(d.getUTCDate() - 30);
  }
  return d.toISOString();
}

// ─────────────────────── identity / clearance ───────────────────────

export const getMyClearance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: owner }, { data: perms }] = await Promise.all([
      supabase.rpc("is_owner", { _user: userId }),
      supabase.from("admin_permissions").select("scopes,label").eq("user_id", userId).maybeSingle(),
    ]);
    const isOwner = !!owner;
    const scopes: string[] = isOwner ? ["*"] : ((perms as any)?.scopes ?? []);
    return {
      userId,
      isOwner,
      scopes,
      label: (perms as any)?.label ?? (isOwner ? "Super Admin" : null),
      hasAny: isOwner || scopes.length > 0,
    };
  });

// ───────────────────────── command overview ─────────────────────────

export const getCommandOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertScope(supabase, userId, "overview");

    const today = rangeStart("today");
    const month = rangeStart("month");
    const year = rangeStart("year");
    const d30 = rangeStart("30d");

    const db = supabase as any;
    const count = async (table: string, build?: (q: any) => any) => {
      let q = db.from(table).select("id", { count: "exact", head: true });
      if (build) q = build(q);
      const { count: c } = await q;
      return c ?? 0;
    };

    const sum = async (since: string, kinds?: string[]) => {
      let q = db
        .from("transactions")
        .select("gross_cents, platform_fee_cents, refunded_cents, kind, status")
        .gte("created_at", since)
        .eq("status", "succeeded");
      if (kinds) q = q.in("kind", kinds);
      const { data } = await q;
      const rows = (data ?? []) as any[];
      return {
        gross: rows.reduce((a, r) => a + (r.gross_cents ?? 0), 0),
        fees: rows.reduce((a, r) => a + (r.platform_fee_cents ?? 0), 0),
        refunded: rows.reduce((a, r) => a + (r.refunded_cents ?? 0), 0),
        count: rows.length,
      };
    };

    const [
      users,
      usersToday,
      usersMonth,
      activeUsers,
      blocked,
      businesses,
      businessesPending,
      businessesNew,
      subscribedBusinesses,
      productsCount,
      ordersToday,
      ordersMonth,
      pendingPayments,
      failedPayments,
      reportsOpen,
      supportOpen,
      adRequestsPending,
      activeCampaigns,
    ] = await Promise.all([
      count("profiles"),
      count("profiles", (q) => q.gte("created_at", today)),
      count("profiles", (q) => q.gte("created_at", month)),
      count("profiles", (q) => q.gte("last_checkin_at", d30)),
      count("profiles", (q) => q.eq("is_suspended", true)),
      count("vendors"),
      count("vendors", (q) => q.eq("verification_status", "pending")),
      count("vendors", (q) => q.gte("created_at", month)),
      count("subscriptions", (q) => q.in("status", ["active", "trialing"])),
      count("products"),
      count("orders", (q) => q.gte("created_at", today)),
      count("orders", (q) => q.gte("created_at", month)),
      count("payments", (q) => q.eq("status", "pending")),
      count("payments", (q) => q.eq("status", "failed")),
      count("reports", (q) => q.eq("status", "open")),
      count("support_cases", (q) => q.eq("status", "open")),
      count("ad_requests", (q) => q.eq("status", "pending")),
      count("ad_campaigns", (q) => q.eq("status", "active")),
    ]);

    const [rToday, rMonth, rYear, rAds, rSubs, rMarket, rRefunds] = await Promise.all([
      sum(today),
      sum(month),
      sum(year),
      sum(month, ["ad"]),
      sum(month, ["creator_subscription", "plan"]),
      sum(month, ["order"]),
      sum(month, ["other"]),
    ]);

    return {
      users: {
        total: users,
        today: usersToday,
        month: usersMonth,
        active30d: activeUsers,
        blocked,
      },
      businesses: {
        total: businesses,
        pending: businessesPending,
        new: businessesNew,
        subscribed: subscribedBusinesses,
      },
      commerce: { products: productsCount, ordersToday, ordersMonth },
      revenue: {
        todayGross: rToday.gross,
        todayNet: rToday.gross - rToday.refunded,
        todayTx: rToday.count,
        monthGross: rMonth.gross,
        yearGross: rYear.gross,
        adsMonth: rAds.gross,
        subsMonth: rSubs.gross,
        commissionMonth: rMarket.fees,
        serviceFeesMonth: rMonth.fees - rMarket.fees,
        refundsMonth: rMonth.refunded + rRefunds.gross,
      },
      payments: { pending: pendingPayments, failed: failedPayments },
      attention: {
        reportsOpen,
        supportOpen,
        adRequestsPending,
        activeCampaigns,
        businessesPending,
      },
    };
  });

// ───────────────────────── revenue dashboard ─────────────────────────

export const getRevenueDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        range: z
          .enum(["today", "yesterday", "7d", "30d", "month", "year"])
          .default("30d"),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertScope(supabase, userId, "finance");
    const since = rangeStart(data.range);
    const { data: rows, error } = await supabase
      .from("transactions")
      .select(
        "id, kind, status, currency, gross_cents, platform_fee_cents, processor_fee_cents, refunded_cents, created_at",
      )
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(5000);
    if (error) throw new Error(error.message);

    const tx = (rows ?? []) as any[];
    const ok = tx.filter((t) => t.status === "succeeded");
    const bySource: Record<string, number> = {};
    for (const t of ok) bySource[t.kind] = (bySource[t.kind] ?? 0) + (t.gross_cents ?? 0);

    const byDay: Record<string, number> = {};
    for (const t of ok) {
      const k = String(t.created_at).slice(0, 10);
      byDay[k] = (byDay[k] ?? 0) + (t.gross_cents ?? 0);
    }

    return {
      range: data.range,
      since,
      totals: {
        gross: ok.reduce((a, t) => a + (t.gross_cents ?? 0), 0),
        platformFees: ok.reduce((a, t) => a + (t.platform_fee_cents ?? 0), 0),
        processorFees: ok.reduce((a, t) => a + (t.processor_fee_cents ?? 0), 0),
        refunds: ok.reduce((a, t) => a + (t.refunded_cents ?? 0), 0),
        transactions: ok.length,
        failed: tx.filter((t) => t.status === "failed").length,
        pending: tx.filter((t) => t.status === "pending").length,
      },
      bySource: Object.entries(bySource)
        .map(([kind, cents]) => ({ kind, cents }))
        .sort((a, b) => b.cents - a.cents),
      series: Object.entries(byDay)
        .map(([day, cents]) => ({ day, cents }))
        .sort((a, b) => a.day.localeCompare(b.day)),
    };
  });

// ─────────────────────────── global search ───────────────────────────

export const commandSearch = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ q: z.string().min(1).max(120) }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertScope(supabase, userId, "overview");
    const term = `%${data.q.trim()}%`;

    const [users, vendors, products, listings, invoices, campaigns, cases] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, handle, display_name, avatar_url, is_suspended")
        .or(`handle.ilike.${term},display_name.ilike.${term}`)
        .limit(8),
      supabase
        .from("vendors")
        .select("id, slug, business_name, verification_status")
        .or(`business_name.ilike.${term},slug.ilike.${term},email.ilike.${term}`)
        .limit(8),
      supabase.from("products").select("id, name, price_cents, currency").ilike("name", term).limit(8),
      supabase.from("listings").select("id, title, price_cents, currency, status").ilike("title", term).limit(8),
      supabase.from("invoices").select("id, number, total_cents, currency, status").ilike("number", term).limit(8),
      supabase.from("ad_campaigns").select("id, name, status").ilike("name", term).limit(8),
      supabase.from("support_cases").select("id, subject, status").ilike("subject", term).limit(8),
    ]);

    return {
      users: users.data ?? [],
      businesses: vendors.data ?? [],
      products: products.data ?? [],
      listings: listings.data ?? [],
      invoices: invoices.data ?? [],
      campaigns: campaigns.data ?? [],
      cases: cases.data ?? [],
    };
  });

// ──────────────────────────── users module ───────────────────────────

export const commandListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        q: z.string().max(120).optional(),
        status: z.enum(["all", "active", "suspended", "verified", "business", "premium"]).default("all"),
        limit: z.number().int().min(1).max(200).default(50),
        offset: z.number().int().min(0).default(0),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertScope(supabase, userId, "users");
    let q = supabase
      .from("profiles")
      .select(
        "id, handle, display_name, avatar_url, location, tier, level, is_verified, is_suspended, suspended_reason, suspended_at, is_business, is_premium, created_at, last_checkin_at, posts_count, listings_count",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);

    if (data.q) q = q.or(`handle.ilike.%${data.q}%,display_name.ilike.%${data.q}%`);
    if (data.status === "active") q = q.eq("is_suspended", false);
    if (data.status === "suspended") q = q.eq("is_suspended", true);
    if (data.status === "verified") q = q.eq("is_verified", true);
    if (data.status === "business") q = q.eq("is_business", true);
    if (data.status === "premium") q = q.eq("is_premium", true);

    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });

export const commandUserDossier = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertScope(supabase, userId, "users");
    const id = data.id;

    const [profile, roles, vehicles, posts, orders, payments, listings, vendor, subs, reports, sessions] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
        supabase.from("user_roles").select("role, created_at").eq("user_id", id),
        supabase
          .from("vehicles")
          .select("id, kind, make, model, year, nickname, hero_image_url, created_at")
          .eq("owner_id", id)
          .is("deleted_at", null),
        supabase
          .from("posts")
          .select("id, kind, caption, created_at, is_hidden")
          .eq("author_id", id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("orders")
          .select("id, total_cents, currency, status, created_at")
          .eq("buyer_id", id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("payments")
          .select("id, amount_cents, currency, status, provider, created_at")
          .eq("user_id", id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("listings")
          .select("id, title, price_cents, currency, status, created_at")
          .eq("seller_id", id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("vendors")
          .select("id, business_name, slug, verification_status, business_type")
          .eq("owner_id", id)
          .maybeSingle(),
        supabase.from("subscriptions").select("id, plan_id, status, current_period_end").eq("user_id", id),
        supabase.from("reports").select("id, reason, status, created_at").eq("target_id", id).limit(20),
        supabase
          .from("admin_support_sessions")
          .select("id, admin_id, reason, started_at, expires_at, ended_at")
          .eq("target_user_id", id)
          .order("started_at", { ascending: false })
          .limit(10),
      ]);

    if (!profile.data) throw new Error("User not found");

    return {
      profile: profile.data,
      roles: (roles.data ?? []).map((r: any) => r.role),
      vehicles: vehicles.data ?? [],
      posts: posts.data ?? [],
      orders: orders.data ?? [],
      payments: payments.data ?? [],
      listings: listings.data ?? [],
      vendor: vendor.data ?? null,
      subscriptions: subs.data ?? [],
      reports: reports.data ?? [],
      supportSessions: sessions.data ?? [],
      revenueCents: (payments.data ?? [])
        .filter((p: any) => p.status === "succeeded" || p.status === "paid")
        .reduce((a: number, p: any) => a + (p.amount_cents ?? 0), 0),
    };
  });

export const commandSetUserBlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum(["block", "unblock", "suspend"]),
        reason: z.string().min(3).max(500),
        notes: z.string().max(2000).optional(),
        durationDays: z.number().int().min(1).max(3650).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertScope(supabase, userId, "users");

    const { data: before } = await supabase
      .from("profiles")
      .select("id, handle, is_suspended, suspended_reason, suspended_at")
      .eq("id", data.id)
      .maybeSingle();
    if (!before) throw new Error("User not found");

    const blocking = data.action !== "unblock";
    const suffix =
      data.action === "suspend" && data.durationDays ? ` (suspended ${data.durationDays}d)` : "";

    const { data: after, error } = await supabase
      .from("profiles")
      .update({
        is_suspended: blocking,
        suspended_reason: blocking ? `${data.reason}${suffix}` : null,
        suspended_at: blocking ? new Date().toISOString() : null,
        suspended_by: blocking ? userId : null,
      })
      .eq("id", data.id)
      .select("id, handle, is_suspended, suspended_reason, suspended_at")
      .single();
    if (error) throw new Error(error.message);

    await audit(supabase, userId, `user.${data.action}`, "profiles", data.id, before, {
      ...after,
      notes: data.notes ?? null,
      duration_days: data.durationDays ?? null,
    });
    return after;
  });

// ────────────────────── support (impersonation) ──────────────────────

export const commandStartSupportSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        targetUserId: z.string().uuid(),
        reason: z.string().min(5).max(500),
        minutes: z.number().int().min(5).max(120).default(30),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertScope(supabase, userId, "support");
    const expires = new Date(Date.now() + data.minutes * 60_000).toISOString();
    const { data: row, error } = await supabase
      .from("admin_support_sessions")
      .insert({
        admin_id: userId,
        target_user_id: data.targetUserId,
        reason: data.reason,
        expires_at: expires,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await audit(supabase, userId, "support.session.start", "profiles", data.targetUserId, null, {
      session_id: row.id,
      expires_at: expires,
      reason: data.reason,
    });
    return row;
  });

export const commandEndSupportSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ id: z.string().uuid(), notes: z.string().max(2000).optional() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertScope(supabase, userId, "support");
    const { data: row, error } = await supabase
      .from("admin_support_sessions")
      .update({ ended_at: new Date().toISOString(), notes: data.notes ?? null })
      .eq("id", data.id)
      .eq("admin_id", userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await audit(supabase, userId, "support.session.end", "profiles", row.target_user_id, null, {
      session_id: row.id,
    });
    return row;
  });

export const commandListSupportSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertScope(supabase, userId, "support");
    const { data, error } = await supabase
      .from("admin_support_sessions")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ───────────────────────── businesses module ─────────────────────────

export const commandListBusinesses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        q: z.string().max(120).optional(),
        status: z.enum(["all", "pending", "approved", "rejected", "info_requested"]).default("all"),
        limit: z.number().int().min(1).max(200).default(50),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertScope(supabase, userId, "businesses");
    let q = supabase
      .from("vendors")
      .select(
        "id, slug, business_name, business_type, owner_id, owner_name, email, phone, city, country, verification_status, is_verified, is_premium, premium_until, followers_count, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status !== "all") q = q.eq("verification_status", data.status);
    if (data.q) q = q.or(`business_name.ilike.%${data.q}%,slug.ilike.%${data.q}%,email.ilike.%${data.q}%`);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });

export const commandSetBusinessStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["approved", "rejected", "info_requested", "pending"]),
        notes: z.string().max(2000).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertScope(supabase, userId, "businesses");
    const { data: before } = await supabase
      .from("vendors")
      .select("id, business_name, verification_status, is_verified, owner_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!before) throw new Error("Business not found");

    const { data: after, error } = await supabase
      .from("vendors")
      .update({
        verification_status: data.status,
        verification_notes: data.notes ?? null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
        is_verified: data.status === "approved",
      })
      .eq("id", data.id)
      .select("id, business_name, verification_status, is_verified, owner_id")
      .single();
    if (error) throw new Error(error.message);

    if (data.status === "approved") {
      await supabase
        .from("user_roles")
        .upsert(
          { user_id: after.owner_id, role: "vendor", granted_by: userId },
          { onConflict: "user_id,role" },
        );
    } else if (data.status === "rejected") {
      await supabase.from("user_roles").delete().eq("user_id", after.owner_id).eq("role", "vendor");
    }

    await audit(supabase, userId, `business.${data.status}`, "vendors", data.id, before, after);
    return after;
  });

// ──────────────────────────────── CRM ────────────────────────────────

export const crmBoard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertScope(supabase, userId, "crm");
    const [stages, leads, cases] = await Promise.all([
      supabase.from("crm_stages").select("*").order("sort"),
      supabase
        .from("crm_leads")
        .select("*")
        .is("archived_at", null)
        .order("updated_at", { ascending: false })
        .limit(500),
      supabase
        .from("support_cases")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    return {
      stages: stages.data ?? [],
      leads: leads.data ?? [],
      cases: cases.data ?? [],
    };
  });

export const crmUpsertLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1).max(160),
        kind: z.string().max(40).default("business"),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().max(40).optional(),
        company: z.string().max(160).optional(),
        country: z.string().max(80).optional(),
        city: z.string().max(80).optional(),
        stage: z.string().max(40).default("new_lead"),
        source: z.string().max(80).optional(),
        value_cents: z.number().int().min(0).default(0),
        currency: z.string().length(3).default("USD"),
        notes: z.string().max(4000).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertScope(supabase, userId, "crm");
    const payload: any = { ...data, email: data.email || null, created_by: userId };
    delete payload.id;
    const res = data.id
      ? await supabase.from("crm_leads").update(payload).eq("id", data.id).select("*").single()
      : await supabase.from("crm_leads").insert(payload).select("*").single();
    if (res.error) throw new Error(res.error.message);
    await audit(supabase, userId, data.id ? "crm.lead.update" : "crm.lead.create", "crm_leads", res.data.id, null, res.data);
    return res.data;
  });

export const crmMoveLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ id: z.string().uuid(), stage: z.string().max(40) }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertScope(supabase, userId, "crm");
    const { data: row, error } = await supabase
      .from("crm_leads")
      .update({ stage: data.stage })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await audit(supabase, userId, "crm.lead.stage", "crm_leads", data.id, null, { stage: data.stage });
    return row;
  });

export const crmSetCaseStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["open", "pending", "resolved", "closed"]),
        resolution: z.string().max(2000).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertScope(supabase, userId, "support");
    const { data: row, error } = await supabase
      .from("support_cases")
      .update({
        status: data.status,
        resolution: data.resolution ?? null,
        assigned_admin_id: userId,
        resolved_at: data.status === "resolved" || data.status === "closed" ? new Date().toISOString() : null,
      })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await audit(supabase, userId, "support.case." + data.status, "support_cases", data.id, null, row);
    return row;
  });

// ──────────────────────────────── ERP ────────────────────────────────

export const erpOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertScope(supabase, userId, "erp");
    const [stock, suppliers, pos, warehouses] = await Promise.all([
      supabase.from("stock_items").select("*").order("updated_at", { ascending: false }).limit(200),
      supabase.from("suppliers").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("purchase_orders").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("warehouses").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    const items = (stock.data ?? []) as any[];
    return {
      stock: items,
      suppliers: suppliers.data ?? [],
      purchaseOrders: pos.data ?? [],
      warehouses: warehouses.data ?? [],
      lowStock: items.filter((i) => Number(i.qty_on_hand) <= Number(i.reorder_level)),
      stockValueCents: items.reduce((a, i) => a + Number(i.qty_on_hand) * Number(i.cost_cents), 0),
    };
  });

export const erpUpsertStockItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1).max(160),
        sku: z.string().max(80).optional(),
        qty_on_hand: z.number().min(0).default(0),
        reorder_level: z.number().min(0).default(0),
        cost_cents: z.number().int().min(0).default(0),
        price_cents: z.number().int().min(0).default(0),
        currency: z.string().length(3).default("USD"),
        warehouse_id: z.string().uuid().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertScope(supabase, userId, "erp");
    const payload: any = { ...data };
    delete payload.id;
    const res = data.id
      ? await supabase.from("stock_items").update(payload).eq("id", data.id).select("*").single()
      : await supabase.from("stock_items").insert(payload).select("*").single();
    if (res.error) throw new Error(res.error.message);
    await audit(supabase, userId, "erp.stock.upsert", "stock_items", res.data.id, null, res.data);
    return res.data;
  });

export const erpAdjustStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        stock_item_id: z.string().uuid(),
        qty: z.number(),
        kind: z.enum(["adjustment", "receipt", "sale", "return", "transfer"]).default("adjustment"),
        reason: z.string().max(400).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertScope(supabase, userId, "erp");
    const { data: item, error: e1 } = await supabase
      .from("stock_items")
      .select("id, qty_on_hand")
      .eq("id", data.stock_item_id)
      .single();
    if (e1) throw new Error(e1.message);
    const next = Number(item.qty_on_hand) + data.qty;
    const { error: e2 } = await supabase
      .from("stock_items")
      .update({ qty_on_hand: next })
      .eq("id", data.stock_item_id);
    if (e2) throw new Error(e2.message);
    await supabase.from("stock_movements").insert({
      stock_item_id: data.stock_item_id,
      kind: data.kind,
      qty: data.qty,
      reason: data.reason ?? null,
      actor_id: userId,
    });
    await audit(supabase, userId, "erp.stock.move", "stock_items", data.stock_item_id, {
      qty: item.qty_on_hand,
    }, { qty: next });
    return { qty_on_hand: next };
  });

// ───────────────────────────── advertising ───────────────────────────

export const adsWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertScope(supabase, userId, "ads");
    const [requests, placements, campaigns] = await Promise.all([
      supabase.from("ad_requests").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("ad_placements").select("*").order("sort"),
      supabase
        .from("ad_campaigns")
        .select(
          "id, name, status, objective, budget_total_cents, spent_cents, currency, impressions_count, clicks_count, engagements_count, start_at, end_at, vendor_id",
        )
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    const c = (campaigns.data ?? []) as any[];
    return {
      requests: requests.data ?? [],
      placements: placements.data ?? [],
      campaigns: c,
      analytics: {
        impressions: c.reduce((a, x) => a + (x.impressions_count ?? 0), 0),
        clicks: c.reduce((a, x) => a + (x.clicks_count ?? 0), 0),
        engagements: c.reduce((a, x) => a + (x.engagements_count ?? 0), 0),
        spend: c.reduce((a, x) => a + (x.spent_cents ?? 0), 0),
        active: c.filter((x) => x.status === "active").length,
      },
    };
  });

export const adsDecideRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum([
          "pending",
          "awaiting_payment",
          "approved",
          "scheduled",
          "active",
          "paused",
          "completed",
          "rejected",
        ]),
        price_cents: z.number().int().min(0).optional(),
        service_fee_cents: z.number().int().min(0).optional(),
        admin_notes: z.string().max(2000).optional(),
        createInvoice: z.boolean().default(false),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertScope(supabase, userId, "ads");

    const { data: before } = await supabase.from("ad_requests").select("*").eq("id", data.id).maybeSingle();
    if (!before) throw new Error("Request not found");

    const patch: any = {
      status: data.status,
      admin_notes: data.admin_notes ?? before.admin_notes,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    };
    if (data.price_cents !== undefined) patch.price_cents = data.price_cents;
    if (data.service_fee_cents !== undefined) patch.service_fee_cents = data.service_fee_cents;

    // Approving materialises a real campaign the ad server can deliver.
    if (
      (data.status === "approved" || data.status === "scheduled" || data.status === "active") &&
      !before.campaign_id
    ) {
      const { data: camp, error: ce } = await supabase
        .from("ad_campaigns")
        .insert({
          owner_id: before.requested_by,
          vendor_id: before.vendor_id,
          name: before.campaign_name,
          objective: before.objective as any,
          status: data.status === "active" ? "active" : "pending",
          budget_total_cents: data.price_cents ?? before.budget_cents,
          currency: before.currency,
          start_at: before.start_date ? new Date(before.start_date).toISOString() : null,
          end_at: before.end_date ? new Date(before.end_date).toISOString() : null,
          placements: before.placements as any,
          geo_countries: before.target_countries,
          geo_cities: before.target_cities,
        })
        .select("id")
        .single();
      if (ce) throw new Error(ce.message);
      patch.campaign_id = camp.id;
    }

    if (data.createInvoice && !before.invoice_id) {
      const price = data.price_cents ?? before.budget_cents ?? 0;
      const fee = data.service_fee_cents ?? 0;
      const number = `ADV-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const { data: inv, error: ie } = await supabase
        .from("invoices")
        .insert({
          number,
          kind: "advertising",
          user_id: before.requested_by,
          vendor_id: before.vendor_id,
          currency: before.currency,
          subtotal_cents: price,
          fee_cents: fee,
          total_cents: price + fee,
          status: "issued",
          created_by: userId,
          meta: { ad_request_id: before.id },
        })
        .select("id")
        .single();
      if (ie) throw new Error(ie.message);
      await supabase.from("invoice_items").insert([
        { invoice_id: inv.id, description: `Campaign: ${before.campaign_name}`, qty: 1, unit_cents: price, total_cents: price },
        ...(fee > 0
          ? [{ invoice_id: inv.id, description: "Campaign management service fee", qty: 1, unit_cents: fee, total_cents: fee }]
          : []),
      ]);
      patch.invoice_id = inv.id;
      if (data.status === "approved") patch.status = "awaiting_payment";
    }

    const { data: after, error } = await supabase
      .from("ad_requests")
      .update(patch)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await audit(supabase, userId, `ads.request.${data.status}`, "ad_requests", data.id, before, after);
    return after;
  });

export const adsUpsertPlacement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        id: z.string().uuid().optional(),
        key: z.string().min(2).max(60),
        label: z.string().min(2).max(120),
        description: z.string().max(500).optional(),
        price_cents: z.number().int().min(0),
        currency: z.string().length(3).default("USD"),
        duration_days: z.number().int().min(1).max(365),
        is_available: z.boolean().default(true),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertScope(supabase, userId, "ads");
    const payload: any = { ...data };
    delete payload.id;
    const res = data.id
      ? await supabase.from("ad_placements").update(payload).eq("id", data.id).select("*").single()
      : await supabase.from("ad_placements").insert(payload).select("*").single();
    if (res.error) throw new Error(res.error.message);
    await audit(supabase, userId, "ads.placement.upsert", "ad_placements", res.data.id, null, res.data);
    return res.data;
  });

/** Business-facing: submit an advertising request. Any signed-in user may call. */
export const submitAdRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        vendor_id: z.string().uuid().optional(),
        campaign_name: z.string().min(2).max(160),
        objective: z.string().max(60).default("profile_visits"),
        audience: z.string().max(500).optional(),
        target_countries: z.array(z.string().max(60)).default([]),
        target_cities: z.array(z.string().max(80)).default([]),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        budget_cents: z.number().int().min(0).default(0),
        currency: z.string().length(3).default("USD"),
        placements: z.array(z.string().max(60)).default([]),
        media: z.array(z.string().url()).default([]),
        description: z.string().max(4000).optional(),
        cta_label: z.string().max(60).optional(),
        cta_url: z.string().url().optional().or(z.literal("")),
        contact_info: z.string().max(300).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("ad_requests")
      .insert({
        ...data,
        cta_url: data.cta_url || null,
        media: data.media,
        requested_by: userId,
        status: "pending",
      })
      .select("id, status")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ───────────────────────────── finance ───────────────────────────────

export const financeInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        status: z.enum(["all", "draft", "issued", "paid", "void", "overdue"]).default("all"),
        limit: z.number().int().min(1).max(200).default(100),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertScope(supabase, userId, "finance");
    let q = supabase.from("invoices").select("*").order("issued_at", { ascending: false }).limit(data.limit);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const financeSetInvoiceStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z.object({ id: z.string().uuid(), status: z.enum(["draft", "issued", "paid", "void"]) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertScope(supabase, userId, "finance");
    const { data: row, error } = await supabase
      .from("invoices")
      .update({ status: data.status, paid_at: data.status === "paid" ? new Date().toISOString() : null })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await audit(supabase, userId, `invoice.${data.status}`, "invoices", data.id, null, row);
    return row;
  });

export const financeTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        status: z.enum(["all", "pending", "succeeded", "failed", "refunded"]).default("all"),
        limit: z.number().int().min(1).max(300).default(100),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertScope(supabase, userId, "finance");
    let q = supabase
      .from("transactions")
      .select(
        "id, kind, status, currency, gross_cents, platform_fee_cents, processor_fee_cents, refunded_cents, provider, buyer_id, seller_id, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ───────────────────────────── content CMS ───────────────────────────

export const contentWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertScope(supabase, userId, "content");
    const [banners, articles] = await Promise.all([
      supabase.from("cms_banners").select("*").order("sort"),
      supabase.from("cms_articles").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    return { banners: banners.data ?? [], articles: articles.data ?? [] };
  });

export const contentUpsertBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        id: z.string().uuid().optional(),
        slot: z.string().min(2).max(60),
        title: z.string().min(1).max(160),
        subtitle: z.string().max(300).optional(),
        image_url: z.string().url().optional().or(z.literal("")),
        link_url: z.string().max(400).optional(),
        is_active: z.boolean().default(false),
        sort: z.number().int().min(0).default(0),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertScope(supabase, userId, "content");
    const payload: any = { ...data, image_url: data.image_url || null, created_by: userId };
    delete payload.id;
    const res = data.id
      ? await supabase.from("cms_banners").update(payload).eq("id", data.id).select("*").single()
      : await supabase.from("cms_banners").insert(payload).select("*").single();
    if (res.error) throw new Error(res.error.message);
    await audit(supabase, userId, "content.banner.upsert", "cms_banners", res.data.id, null, res.data);
    return res.data;
  });

export const contentUpsertArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        id: z.string().uuid().optional(),
        slug: z
          .string()
          .min(2)
          .max(120)
          .regex(/^[a-z0-9-]+$/, "lowercase letters, numbers and dashes only"),
        title: z.string().min(2).max(200),
        excerpt: z.string().max(400).optional(),
        body: z.string().max(50000).default(""),
        cover_url: z.string().url().optional().or(z.literal("")),
        status: z.enum(["draft", "published", "archived"]).default("draft"),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertScope(supabase, userId, "content");
    const payload: any = {
      ...data,
      cover_url: data.cover_url || null,
      author_id: userId,
      published_at: data.status === "published" ? new Date().toISOString() : null,
    };
    delete payload.id;
    const res = data.id
      ? await supabase.from("cms_articles").update(payload).eq("id", data.id).select("*").single()
      : await supabase.from("cms_articles").insert(payload).select("*").single();
    if (res.error) throw new Error(res.error.message);
    await audit(supabase, userId, "content.article.upsert", "cms_articles", res.data.id, null, res.data);
    return res.data;
  });

// ───────────────────────── system / roles / audit ────────────────────

export const systemAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertScope(supabase, userId, "system");
    const { data: perms, error } = await supabase
      .from("admin_permissions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = (perms ?? []).map((p: any) => p.user_id);
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("id, handle, display_name, avatar_url").in("id", ids)
      : { data: [] as any[] };
    return (perms ?? []).map((p: any) => ({
      ...p,
      profile: (profiles ?? []).find((x: any) => x.id === p.user_id) ?? null,
    }));
  });

export const systemSetAdminScopes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        user_id: z.string().uuid(),
        scopes: z.array(z.string().max(40)).max(20),
        label: z.string().max(80).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Only the platform owner may mint or change administrators.
    const { data: owner } = await supabase.rpc("is_owner", { _user: userId });
    if (!owner) throw new Error("Forbidden — owner only");
    const { data: before } = await supabase
      .from("admin_permissions")
      .select("*")
      .eq("user_id", data.user_id)
      .maybeSingle();
    const { data: after, error } = await supabase
      .from("admin_permissions")
      .upsert(
        { user_id: data.user_id, scopes: data.scopes, label: data.label ?? null, updated_by: userId },
        { onConflict: "user_id" },
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await audit(supabase, userId, "system.admin.scopes", "admin_permissions", data.user_id, before, after);
    return after;
  });

export const systemAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        q: z.string().max(120).optional(),
        limit: z.number().int().min(1).max(300).default(150),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertScope(supabase, userId, "system");
    let q = supabase
      .from("owner_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.q) q = q.ilike("action", `%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const systemHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertScope(supabase, userId, "system");
    const probe = async (table: string) => {
      const t0 = Date.now();
      const { error } = await (supabase as any).from(table).select("id", { count: "exact", head: true }).limit(1);
      return { ok: !error, ms: Date.now() - t0, error: error?.message ?? null };
    };
    const [db, auth, storage, payments, notifications] = await Promise.all([
      probe("profiles"),
      probe("user_roles"),
      probe("video_assets"),
      probe("payments"),
      probe("notifications"),
    ]);
    const { data: crashes } = await supabase
      .from("crash_reports")
      .select("id, message, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    return {
      services: { db, auth, storage, payments, notifications },
      recentCrashes: crashes ?? [],
      checkedAt: new Date().toISOString(),
    };
  });
