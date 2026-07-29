/**
 * Automated payout settlement — called on a schedule by pg_cron.
 *
 * Sweeps every seller whose payable balance clears their withdrawal minimum
 * and whose payout schedule is due, creating a payout batch. Guarded by the
 * dedicated CRON_SECRET header set by pg_cron.
 */
import { createFileRoute } from "@tanstack/react-router";
import { requireCronSecret } from "@/lib/cron-auth.server";

export const Route = createFileRoute("/api/public/hooks/run-payouts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = requireCronSecret(request);
        if (denied) return denied;

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
