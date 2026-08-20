/**
 * Settlement reconciliation sweep — called on a schedule by pg_cron.
 *
 * Belt-and-braces against a webhook whose settlement step failed after the
 * payment had already been flipped to `succeeded`: the provider retry
 * short-circuits on the terminal status, so without this sweep the platform
 * commission for that payment would be lost silently.
 */
import { createFileRoute } from "@tanstack/react-router";
import { requireCronSecret } from "@/lib/cron-auth.server";

export const Route = createFileRoute("/api/public/hooks/reconcile-settlements")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = requireCronSecret(request);
        if (denied) return denied;

        try {
          const { reconcileSettlements } = await import("@/lib/settlement.server");
          const result = await reconcileSettlements();
          return Response.json({ ok: true, ...result });
        } catch (e: any) {
          console.error("[hooks/reconcile-settlements] failed", e);
          return new Response(`reconcile: ${e?.message ?? "failed"}`, { status: 500 });
        }
      },
    },
  },
});
