/**
 * Payments webhook — provider-agnostic completion callback for real providers.
 *
 * Verifies HMAC-SHA256 over the raw body using `PAYMENTS_WEBHOOK_SECRET`.
 * Body: { payment_id: uuid, status: "succeeded"|"failed", provider_ref?: string }
 *
 * On success, flips the payment to `succeeded` and activates the linked
 * subscription. The in-app mock checkout uses `confirmMockPayment` instead so
 * end users never see the shared secret.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/webhooks/payments")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PAYMENTS_WEBHOOK_SECRET;
        if (!secret) return new Response("Webhook not configured", { status: 503 });

        // Replay protection: require a fresh timestamp header and include it
        // in the signed payload so captured requests can't be replayed.
        const tsHeader = request.headers.get("x-timestamp") ?? "";
        const ts = Number.parseInt(tsHeader, 10);
        if (!Number.isFinite(ts)) return new Response("Missing timestamp", { status: 400 });
        const skew = Math.abs(Date.now() - ts);
        if (skew > 5 * 60 * 1000) return new Response("Stale timestamp", { status: 401 });

        const sigHeader = request.headers.get("x-signature") ?? "";
        const raw = await request.text();
        const expected = createHmac("sha256", secret).update(`${tsHeader}.${raw}`).digest("hex");
        const a = Buffer.from(sigHeader);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b))
          return new Response("Invalid signature", { status: 401 });

        let payload: { payment_id?: string; status?: string; provider_ref?: string };
        try {
          payload = JSON.parse(raw);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        if (!payload.payment_id || !payload.status)
          return new Response("Missing fields", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: payment, error: fetchErr } = await supabaseAdmin
          .from("payments")
          .select("id, status, subscription_id, provider_ref")
          .eq("id", payload.payment_id)
          .maybeSingle();
        if (fetchErr) return new Response(fetchErr.message, { status: 500 });
        if (!payment) return new Response("Payment not found", { status: 404 });

        // Dedupe: refuse to re-apply the same provider_ref on a payment
        // already in a terminal state.
        if (payment.status === "succeeded" || payment.status === "failed") {
          return Response.json({ ok: true, deduped: true, status: payment.status });
        }
        if (payload.provider_ref && payment.provider_ref === payload.provider_ref) {
          return Response.json({ ok: true, deduped: true, status: payment.status });
        }

        const nextStatus = payload.status === "succeeded" ? "succeeded" : "failed";

        // Atomic dedupe: only transition pending → terminal. If another
        // concurrent delivery already flipped the row, `.eq("status","pending")`
        // matches zero rows and we short-circuit as a duplicate.
        const { data: updated, error: updErr } = await supabaseAdmin
          .from("payments")
          .update({ status: nextStatus, provider_ref: payload.provider_ref ?? null })
          .eq("id", payment.id)
          .eq("status", "pending")
          .select("id");
        if (updErr) {
          console.error("[webhook/payments] payment update failed", updErr);
          return new Response("Payment update failed", { status: 500 });
        }
        if (!updated || updated.length === 0) {
          return Response.json({ ok: true, deduped: true, status: payment.status });
        }

        if (nextStatus === "succeeded" && payment.subscription_id) {
          const periodEnd = new Date();
          periodEnd.setMonth(periodEnd.getMonth() + 1);
          const { error: subErr } = await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "active",
              trial_ends_at: null,
              current_period_end: periodEnd.toISOString(),
            })
            .eq("id", payment.subscription_id);
          if (subErr) {
            // Non-2xx so the provider retries — payment succeeded but the
            // subscription didn't activate; we must not silently swallow.
            console.error("[webhook/payments] subscription activation failed", subErr);
            return new Response("Subscription activation failed", { status: 500 });
          }
        }

        // Commission engine: record the transaction + double-entry ledger so
        // the platform's cut is captured on every successful payment.
        if (nextStatus === "succeeded") {
          try {
            const { data: full } = await supabaseAdmin
              .from("payments")
              .select("id, user_id, amount_cents, currency, provider, subscription_id, order_id, seller_id, category, country")
              .eq("id", payment.id)
              .maybeSingle();
            if (full) {
              const { settleTransaction } = await import("@/lib/finance.server");
              await settleTransaction({
                kind: (full as any).order_id ? "order" : (full as any).subscription_id ? "plan" : "other",
                gross_cents: (full as any).amount_cents,
                currency: (full as any).currency ?? "USD",
                buyer_id: (full as any).user_id,
                seller_id: (full as any).seller_id ?? null,
                order_id: (full as any).order_id ?? null,
                payment_id: (full as any).id,
                subscription_id: (full as any).subscription_id ?? null,
                category: (full as any).category ?? null,
                country: (full as any).country ?? null,
                provider: (full as any).provider ?? "mock",
                provider_ref: payload.provider_ref ?? null,
              });
            }
          } catch (e) {
            console.error("[webhook/payments] settlement failed", e);
            return new Response("Settlement failed", { status: 500 });
          }
        }


        return Response.json({ ok: true, status: nextStatus });
      },
    },
  },
});
