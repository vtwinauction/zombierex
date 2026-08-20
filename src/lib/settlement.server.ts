/**
 * Settlement recovery — server-only.
 *
 * A webhook retry short-circuits on the terminal payment status, so settlement
 * must be re-runnable independently of the status flip. `settlePaymentById` is
 * idempotent (transactions carry a unique index on provider/provider_ref and we
 * skip payments that already have a transaction).
 */
import { DEFAULT_CURRENCY } from "@/lib/money";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function settlePaymentById(
  paymentId: string,
  providerRef?: string | null,
): Promise<{ settled: boolean; reason?: string }> {
  const sb = await admin();

  const { data: full } = await sb
    .from("payments")
    .select("id, user_id, amount_cents, currency, provider, subscription_id, order_id")
    .eq("id", paymentId)
    .maybeSingle();
  if (!full) return { settled: false, reason: "payment_not_found" };

  const { data: existing } = await sb
    .from("transactions")
    .select("id")
    .eq("payment_id", paymentId)
    .maybeSingle();
  if (existing) return { settled: false, reason: "already_settled" };

  let sellerId: string | null = null;
  const orderId = (full as { order_id: string | null }).order_id;
  if (orderId) {
    const { data: order } = await sb
      .from("orders")
      .select("vendor_id")
      .eq("id", orderId)
      .maybeSingle();
    const vendorId = (order as { vendor_id: string | null } | null)?.vendor_id ?? null;
    if (vendorId) {
      const { data: vendor } = await sb
        .from("vendors")
        .select("owner_id")
        .eq("id", vendorId)
        .maybeSingle();
      sellerId = (vendor as { owner_id: string | null } | null)?.owner_id ?? null;
    }
  }

  const row = full as {
    id: string;
    user_id: string | null;
    amount_cents: number;
    currency: string | null;
    provider: string | null;
    subscription_id: string | null;
    order_id: string | null;
  };

  const { settleTransaction } = await import("@/lib/finance.server");
  await settleTransaction({
    kind: row.order_id ? "order" : row.subscription_id ? "plan" : "other",
    gross_cents: row.amount_cents,
    currency: row.currency ?? DEFAULT_CURRENCY,
    buyer_id: row.user_id,
    seller_id: sellerId,
    order_id: row.order_id,
    payment_id: row.id,
    subscription_id: row.subscription_id,
    category: null,
    provider: row.provider ?? "mock",
    provider_ref: providerRef ?? null,
  });
  return { settled: true };
}

/** Sweep: settle any succeeded payment that never produced a transaction. */
export async function reconcileSettlements(limit = 100) {
  const sb = await admin();
  const { data: payments } = await sb
    .from("payments")
    .select("id, provider_ref")
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(limit);

  let settled = 0;
  let skipped = 0;
  const failures: string[] = [];
  for (const p of (payments ?? []) as { id: string; provider_ref: string | null }[]) {
    try {
      const res = await settlePaymentById(p.id, p.provider_ref);
      if (res.settled) settled += 1;
      else skipped += 1;
    } catch (e) {
      failures.push(`${p.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { scanned: payments?.length ?? 0, settled, skipped, failures };
}
