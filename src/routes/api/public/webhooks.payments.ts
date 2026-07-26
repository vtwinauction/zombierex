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

        // Dedupe: refuse to re-process a payment already in a terminal state,
        // and refuse to re-apply the same provider_ref.
        if (payment.status === "succeeded" || payment.status === "failed") {
          return Response.json({ ok: true, deduped: true, status: payment.status });
        }
        if (payload.provider_ref && payment.provider_ref === payload.provider_ref) {
          return Response.json({ ok: true, deduped: true, status: payment.status });
        }

        const nextStatus = payload.status === "succeeded" ? "succeeded" : "failed";
        await supabaseAdmin
          .from("payments")
          .update({ status: nextStatus, provider_ref: payload.provider_ref ?? null })
          .eq("id", payment.id);

        if (nextStatus === "succeeded" && payment.subscription_id) {
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

        return Response.json({ ok: true, status: nextStatus });
      },
    },
  },
});
