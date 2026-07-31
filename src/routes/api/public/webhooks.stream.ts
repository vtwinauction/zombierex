/**
 * Cloudflare Stream webhook — marks a video asset ready once transcoding
 * finishes. Signature is verified with CLOUDFLARE_STREAM_WEBHOOK_SECRET
 * (header format: `Webhook-Signature: time=<ts>,sig1=<hex>`).
 */
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

function verify(signatureHeader: string | null, body: string, secret: string): boolean {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, ...rest] = p.trim().split("=");
      return [k, rest.join("=")];
    }),
  ) as Record<string, string>;
  const time = parts.time;
  const sig = parts.sig1;
  if (!time || !sig) return false;

  // Reject replays older than 5 minutes.
  const ts = Number(time);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const expected = createHmac("sha256", secret).update(`${time}.${body}`).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/webhooks/stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET;
        if (!secret) return new Response("Not configured", { status: 503 });

        const body = await request.text();
        if (!verify(request.headers.get("webhook-signature"), body, secret)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: any;
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("Bad payload", { status: 400 });
        }

        const uid: string | undefined = payload?.uid;
        if (!uid) return new Response("Missing uid", { status: 400 });

        const state: string = payload?.status?.state ?? "inprogress";
        const status =
          state === "ready" ? "ready" : state === "error" ? "error" : "processing";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("video_assets")
          .update({
            status,
            playback_hls: payload?.playback?.hls ?? null,
            playback_dash: payload?.playback?.dash ?? null,
            thumbnail_url: payload?.thumbnail ?? null,
            duration_seconds: typeof payload?.duration === "number" ? payload.duration : null,
            width: payload?.input?.width ?? null,
            height: payload?.input?.height ?? null,
            error_message: payload?.status?.errorReasonText ?? null,
          })
          .eq("provider_uid", uid);

        if (error) return new Response("Update failed", { status: 500 });
        return new Response("ok");
      },
    },
  },
});
