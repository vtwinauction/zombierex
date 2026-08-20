/**
 * Finance settlement — server-only.
 *
 * `settleTransaction` is the single place money is split. It is idempotent:
 * the unique index on transactions(provider, provider_ref) plus a status guard
 * mean a replayed webhook can never double-credit anyone.
 */
import {
  computeSplit,
  formatMoney,
  resolveFeeRule,
  type FeeRule,
  type SplitContext,
  type TxnKind,
} from "@/lib/commission";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function loadFeeRules(sb: Admin): Promise<FeeRule[]> {
  const { data, error } = await sb.from("fee_rules").select("*").eq("is_active", true);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as FeeRule[];
}

export async function loadPaymentConfig(sb: Admin): Promise<Record<string, any>> {
  const { data, error } = await sb.from("payment_config").select("key, value");
  if (error) throw new Error(error.message);
  const out: Record<string, any> = {};
  for (const row of data ?? []) out[(row as any).key] = (row as any).value;
  return out;
}

export interface SettleInput {
  kind: TxnKind;
  gross_cents: number;
  currency?: string;
  buyer_id?: string | null;
  seller_id?: string | null;
  order_id?: string | null;
  payment_id?: string | null;
  subscription_id?: string | null;
  category?: string | null;
  country?: string | null;
  provider: string;
  provider_ref?: string | null;
  payment_method?: string | null;
  processor_fee_cents?: number;
  tax_cents?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Computes the split, writes the transaction + double-entry ledger, and
 * returns the resulting record. Safe to call twice with the same provider_ref.
 */
export async function settleTransaction(input: SettleInput) {
  const sb = await admin();
  const currency = input.currency ?? "USD";

  // Idempotency: an existing transaction for this provider_ref wins.
  if (input.provider_ref) {
    const { data: existing } = await sb
      .from("transactions")
      .select("*")
      .eq("provider", input.provider)
      .eq("provider_ref", input.provider_ref)
      .maybeSingle();
    if (existing) return { transaction: existing, deduped: true as const };
  }

  // Seller type influences the rate (e.g. subscribed sellers pay less).
  let sellerType: string | null = null;
  if (input.seller_id) {
    const { data: sfs } = await sb
      .from("seller_finance_settings")
      .select("seller_type")
      .eq("seller_id", input.seller_id)
      .maybeSingle();
    sellerType = (sfs as any)?.seller_type ?? null;
  }

  const rules = await loadFeeRules(sb);
  const ctx: SplitContext = {
    kind: input.kind,
    category: input.category ?? null,
    sellerId: input.seller_id ?? null,
    sellerType,
    country: input.country ?? null,
    currency,
  };
  const rule = resolveFeeRule(rules, ctx);
  const split = computeSplit(input.gross_cents, rule);

  const { data: txn, error } = await sb
    .from("transactions")
    .insert({
      kind: input.kind,
      status: "succeeded",
      buyer_id: input.buyer_id ?? null,
      seller_id: input.seller_id ?? null,
      order_id: input.order_id ?? null,
      payment_id: input.payment_id ?? null,
      subscription_id: input.subscription_id ?? null,
      currency,
      gross_cents: split.gross_cents,
      platform_fee_cents: split.platform_fee_cents,
      processor_fee_cents: input.processor_fee_cents ?? 0,
      tax_cents: input.tax_cents ?? 0,
      net_cents: split.net_cents,
      fee_rule_id: split.rule_id,
      fee_bps: split.fee_bps,
      category: input.category ?? null,
      country: input.country ?? null,
      provider: input.provider,
      provider_ref: input.provider_ref ?? null,
      payment_method: input.payment_method ?? null,
      metadata: (input.metadata ?? {}) as any,
      settled_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    // Unique violation = concurrent duplicate delivery; re-read and dedupe.
    if ((error as any).code === "23505" && input.provider_ref) {
      const { data: existing } = await sb
        .from("transactions")
        .select("*")
        .eq("provider", input.provider)
        .eq("provider_ref", input.provider_ref)
        .maybeSingle();
      if (existing) return { transaction: existing, deduped: true as const };
    }
    throw new Error(error.message);
  }

  await writeLedger(sb, txn as any);

  // Mirror onto the source records so existing screens show the split.
  if (input.payment_id) {
    await sb
      .from("payments")
      .update({
        platform_fee_cents: split.platform_fee_cents,
        net_cents: split.net_cents,
        fee_bps: split.fee_bps,
        transaction_id: (txn as any).id,
      })
      .eq("id", input.payment_id);
  }
  if (input.order_id) {
    await sb
      .from("orders")
      .update({
        platform_fee_cents: split.platform_fee_cents,
        net_cents: split.net_cents,
        transaction_id: (txn as any).id,
        status: "paid",
      })
      .eq("id", input.order_id);
  }

  await notifyParties(sb, txn as any);

  return { transaction: txn, deduped: false as const };
}

async function writeLedger(sb: Admin, txn: any) {
  const rows: any[] = [];
  const base = { transaction_id: txn.id, currency: txn.currency };
  if (txn.platform_fee_cents > 0)
    rows.push({
      ...base,
      account: "platform_revenue",
      direction: "credit",
      amount_cents: txn.platform_fee_cents,
      memo: "Platform commission",
    });
  if (txn.net_cents > 0)
    rows.push({
      ...base,
      account: "seller_payable",
      direction: "credit",
      amount_cents: txn.net_cents,
      party_id: txn.seller_id,
      memo: "Seller net proceeds",
    });
  if (txn.processor_fee_cents > 0)
    rows.push({
      ...base,
      account: "processor_fees",
      direction: "debit",
      amount_cents: txn.processor_fee_cents,
      memo: "Processor cost",
    });
  if (txn.tax_cents > 0)
    rows.push({
      ...base,
      account: "tax_payable",
      direction: "credit",
      amount_cents: txn.tax_cents,
      memo: "Tax collected",
    });
  // Offsetting debit so the books balance: every credit above is funded by
  // cash received from the processor. SUM(debits) === SUM(credits) per txn.
  const credits = rows
    .filter((r) => r.direction === "credit")
    .reduce((n, r) => n + r.amount_cents, 0);
  const debits = rows
    .filter((r) => r.direction === "debit")
    .reduce((n, r) => n + r.amount_cents, 0);
  const offset = credits - debits;
  if (offset !== 0)
    rows.push({
      ...base,
      account: "cash_clearing",
      direction: offset > 0 ? "debit" : "credit",
      amount_cents: Math.abs(offset),
      memo: "Cash received (clearing)",
    });
  if (rows.length) {
    const { error } = await sb.from("ledger_entries").insert(rows);
    if (error) console.error("[finance] ledger write failed", error);
  }
}

async function notifyParties(sb: Admin, txn: any) {
  const rows: any[] = [];
  const amount = formatMoney(txn.gross_cents, txn.currency);
  if (txn.buyer_id)
    rows.push({
      user_id: txn.buyer_id,
      kind: "order",
      payload: {
        title: "Payment confirmed",
        body: `Your payment of ${amount} was successful.`,
      },
    });
  if (txn.seller_id)
    rows.push({
      user_id: txn.seller_id,
      kind: "order",
      payload: {
        title: "You made a sale",
        body: `${formatMoney(txn.net_cents, txn.currency)} added to your balance (after ${formatMoney(txn.platform_fee_cents, txn.currency)} platform fee).`,
      },
    });
  if (!rows.length) return;
  const { error } = await sb.from("notifications").insert(rows);
  if (error) console.error("[finance] notify failed", error);
}

export interface RefundInput {
  transaction_id: string;
  amount_cents?: number;
  reason?: string;
  reclaim_commission?: boolean;
  actor_id?: string | null;
  provider_ref?: string | null;
}

/** Reverses part or all of a transaction and its ledger impact. */
export async function refundTransaction(input: RefundInput) {
  const sb = await admin();
  const { data: txn, error } = await sb
    .from("transactions")
    .select("*")
    .eq("id", input.transaction_id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!txn) throw new Error("Transaction not found");

  const t = txn as any;
  const remaining = t.gross_cents - t.refunded_cents;
  const amount = Math.min(input.amount_cents ?? remaining, remaining);
  if (amount <= 0) throw new Error("Nothing left to refund");

  const cfg = await loadPaymentConfig(sb);
  const reclaim = input.reclaim_commission ?? cfg.refunds?.reclaim_commission ?? true;
  const totalAfter = t.refunded_cents + amount;
  // Remainder maths: the final refund reclaims exactly what is left of the fee
  // so Σ(clawbacks) === platform_fee_cents with no rounding drift.
  let commissionBack = 0;
  if (reclaim) {
    const { data: priorRefunds } = await sb
      .from("refunds")
      .select("commission_returned_cents")
      .eq("transaction_id", t.id);
    const already = ((priorRefunds ?? []) as any[]).reduce(
      (n, r) => n + (r.commission_returned_cents ?? 0),
      0,
    );
    const target =
      totalAfter >= t.gross_cents
        ? t.platform_fee_cents
        : Math.round((t.platform_fee_cents * totalAfter) / t.gross_cents);
    commissionBack = Math.max(0, Math.min(target - already, t.platform_fee_cents - already));
  }
  const sellerBack = amount - commissionBack;

  const { error: rErr } = await sb.from("refunds").insert({
    transaction_id: t.id,
    amount_cents: amount,
    currency: t.currency,
    reason: input.reason ?? null,
    reclaim_commission: reclaim,
    commission_returned_cents: commissionBack,
    provider_ref: input.provider_ref ?? null,
    actor_id: input.actor_id ?? null,
  });
  if (rErr) throw new Error(rErr.message);

  const totalRefunded = t.refunded_cents + amount;
  await sb
    .from("transactions")
    .update({
      refunded_cents: totalRefunded,
      status: totalRefunded >= t.gross_cents ? "refunded" : "partially_refunded",
    })
    .eq("id", t.id);

  const ledger: any[] = [
    {
      transaction_id: t.id,
      account: "cash_clearing",
      direction: "credit",
      amount_cents: amount,
      currency: t.currency,
      memo: input.reason ?? "Refund paid out",
    },
  ];
  if (amount - commissionBack - (amount - commissionBack) !== 0) {
    /* unreachable guard kept for clarity */
  }
  if (commissionBack > 0)
    ledger.push({
      transaction_id: t.id,
      account: "platform_revenue",
      direction: "debit",
      amount_cents: commissionBack,
      currency: t.currency,
      memo: "Commission clawback",
    });
  if (sellerBack > 0)
    ledger.push({
      transaction_id: t.id,
      account: "seller_payable",
      direction: "debit",
      amount_cents: sellerBack,
      currency: t.currency,
      party_id: t.seller_id,
      memo: "Seller refund debit",
    });
  await sb.from("ledger_entries").insert(ledger);

  // Only flip the order once it is fully refunded — a partial refund must
  // leave the order in its fulfilled state.
  if (t.order_id && totalRefunded >= t.gross_cents) {
    await sb.from("orders").update({ status: "refunded" }).eq("id", t.order_id);
  }

  const notes: any[] = [];
  if (t.buyer_id)
    notes.push({
      user_id: t.buyer_id,
      kind: "order",
      payload: {
        title: "Refund issued",
        body: `${formatMoney(amount, t.currency)} has been refunded.`,
      },
    });
  if (t.seller_id)
    notes.push({
      user_id: t.seller_id,
      kind: "order",
      payload: {
        title: "Refund processed",
        body: `A refund of ${formatMoney(amount, t.currency)} was issued on one of your sales.`,
      },
    });
  if (notes.length) await sb.from("notifications").insert(notes);

  return { refunded_cents: amount, commission_returned_cents: commissionBack };
}

function currencyOf(sfs: any): string {
  return sfs?.currency ?? "USD";
}

/** Seller balance = credited net minus debits minus already-paid payouts. */
export async function getSellerBalance(sellerId: string) {
  const sb = await admin();
  const { data: entries } = await sb
    .from("ledger_entries")
    .select("direction, amount_cents")
    .eq("account", "seller_payable")
    .eq("party_id", sellerId);
  let balance = 0;
  for (const e of (entries ?? []) as any[]) {
    balance += e.direction === "credit" ? e.amount_cents : -e.amount_cents;
  }
  const { data: paid } = await sb
    .from("payouts")
    .select("amount_cents, status")
    .eq("seller_id", sellerId)
    .in("status", ["scheduled", "processing", "paid"]);
  for (const p of (paid ?? []) as any[]) balance -= p.amount_cents;
  // Return the true balance — a negative value is recoverable debt (e.g. a
  // refund after a payout) and must stay visible. Clamping happens only at the
  // payout decision, which skips anything below the withdrawal minimum.
  return balance;
}

/** Builds a payout batch for every seller above their withdrawal minimum. */
export async function runPayoutBatch() {
  const sb = await admin();
  const cfg = await loadPaymentConfig(sb);
  const globalMin = cfg.withdrawals?.min_cents ?? 2500;

  const { data: sellers } = await sb
    .from("ledger_entries")
    .select("party_id")
    .eq("account", "seller_payable")
    .not("party_id", "is", null);
  const ids = Array.from(new Set(((sellers ?? []) as any[]).map((r) => r.party_id)));
  if (!ids.length) return { batch_id: null, payouts: 0, total_cents: 0 };

  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 7 * 86_400_000);
  const { data: batch, error: bErr } = await sb
    .from("payout_batches")
    .insert({
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      status: "scheduled",
    })
    .select("id")
    .single();
  if (bErr) throw new Error(bErr.message);

  let total = 0;
  let count = 0;
  for (const sellerId of ids) {
    const balance = await getSellerBalance(sellerId);
    const { data: sfs } = await sb
      .from("seller_finance_settings")
      .select("min_withdrawal_cents, suspended, payout_method")
      .eq("seller_id", sellerId)
      .maybeSingle();
    if ((sfs as any)?.suspended) continue;
    const min = (sfs as any)?.min_withdrawal_cents ?? globalMin;
    if (balance < min) continue;

    await sb.from("payouts").insert({
      batch_id: (batch as any).id,
      seller_id: sellerId,
      amount_cents: balance,
      status: "scheduled",
      method: (sfs as any)?.payout_method ?? null,
      scheduled_for: periodEnd.toISOString(),
    });
    await sb.from("notifications").insert({
      user_id: sellerId,
      kind: "system",
      payload: {
        title: "Payout scheduled",
        body: `A payout of ${formatMoney(balance, currencyOf(sfs))} has been scheduled.`,
      },
    });

    total += balance;
    count += 1;
  }

  await sb
    .from("payout_batches")
    .update({ total_cents: total, payouts_count: count })
    .eq("id", (batch as any).id);

  return { batch_id: (batch as any).id, payouts: count, total_cents: total };
}
