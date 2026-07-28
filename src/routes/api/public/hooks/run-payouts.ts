/**
 * Automated payout settlement — called on a schedule by pg_cron.
 *
 * Sweeps every seller whose payable balance clears their withdrawal minimum
 * and whose payout schedule is due, creating a payout batch. Guarded by the
 * Supabase anon apikey set by pg_cron.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/run-payouts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const anon = process.env.SUPABASE_PUBLISHABLE_KEY;
        const apikey = request.headers.get("apikey") ?? "";
        if (!anon || apikey !== anon) return new Response("Unauthorized", { status: 401 });

        try {
          const { runPayoutBatch } = await import("@/lib/finance.server");
          const result = await runPayoutBatch();
          return Response.json({ ok: true, ...result });
        } catch (e: any) {
          console.error("[hooks/run-payouts] failed", e);
          return new Response(`payouts: ${e?.message ?? "failed"}`, { status: 500 });
        }
      },
    },
  },
});
