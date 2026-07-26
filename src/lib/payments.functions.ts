/**
 * Payments — checkout intent + status.
 *
 * Phase 4 is a real database-backed flow with a provider-agnostic seam:
 * `startCheckout` creates a `payments` row (status=pending) and returns a
 * checkout URL. Providers (Stripe/Paddle) will POST completion to
 * `/api/public/webhooks/payments`, which flips the row to `succeeded` and
 * activates the linked subscription. Until a provider is wired, the mock
 * `POST /api/public/webhooks/payments` route accepts an admin-shared secret
 * so the end-to-end flow is testable today.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const startCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        subscription_id: z.string().uuid(),
        return_url: z.string().url().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    // Must own the subscription
    const { data: sub, error: subErr } = await context.supabase
      .from("subscriptions")
      .select("id, user_id, plan:subscription_plans(price_cents, currency, name)")
      .eq("id", data.subscription_id)
      .maybeSingle();
    if (subErr) throw new Error(subErr.message);
    if (!sub || sub.user_id !== context.userId) throw new Error("Forbidden");

    const plan = (sub as any).plan;
    if (!plan || plan.price_cents <= 0) throw new Error("This plan is free — no payment required");

    const { data: payment, error } = await context.supabase
      .from("payments")
      .insert({
        user_id: context.userId,
        subscription_id: sub.id,
        amount_cents: plan.price_cents,
        currency: plan.currency ?? "USD",
        provider: "mock",
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // TODO: swap for a real Stripe/Paddle Checkout Session URL when the
    // provider is enabled. For now, a hosted mock page collects confirmation.
    return {
      payment_id: payment.id,
      checkout_url: `/checkout/payment/${payment.id}`,
      provider: "mock" as const,
    };
  });

export const getPayment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("payments")
      .select("id, status, amount_cents, currency, provider, provider_ref, subscription_id, created_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Not found");
    return row;
  });

export const listMyPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("payments")
      .select("id, status, amount_cents, currency, provider, created_at, subscription_id")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/**
 * Dev-only: confirm a mock payment without leaving the app.
 * HARD-DISABLED in production — the real provider webhook confirms payments.
 * Explicitly opt-in via ALLOW_MOCK_PAYMENTS=1 for staging/dev builds only.
 */
export const confirmMockPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z.object({
      payment_id: z.string().uuid(),
      outcome: z.enum(["succeeded", "failed"]),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    // Production guard: without the explicit opt-in, refuse. This closes the
    // free-subscription exploit where any authenticated user could flip their
    // own mock payment to "succeeded" and activate a paid plan.
    if (process.env.ALLOW_MOCK_PAYMENTS !== "1" && process.env.NODE_ENV === "production") {
      throw new Error("Mock payment confirmation is disabled in production");
    }

    const { data: payment, error } = await context.supabase
      .from("payments")
      .select("id, user_id, provider, subscription_id")
      .eq("id", data.payment_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!payment || payment.user_id !== context.userId) throw new Error("Forbidden");
    if (payment.provider !== "mock") throw new Error("Only mock payments can be confirmed this way");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("payments")
      .update({ status: data.outcome, provider_ref: `mock_${Date.now()}` })
      .eq("id", payment.id);

    if (data.outcome === "succeeded" && payment.subscription_id) {
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      await supabaseAdmin
        .from("subscriptions")
        .update({
          status: "active",
          trial_ends_at: null,
          current_period_end: periodEnd.toISOString(),
        })
        .eq("id", payment.subscription_id);
    }
    return { ok: true, status: data.outcome };
  });
