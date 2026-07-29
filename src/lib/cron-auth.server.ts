/**
 * Shared authentication for scheduled-job endpoints under /api/public/hooks/*.
 *
 * These endpoints were previously guarded by the Supabase publishable (anon)
 * key, which is shipped in the client bundle and inside the native binaries —
 * i.e. effectively public. They are now guarded by a dedicated `CRON_SECRET`
 * that never leaves the server, compared in constant time.
 */
import { timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Returns a 401/503 Response when the caller is not the scheduler, or null
 * when the request is authorised.
 */
export function requireCronSecret(request: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("Scheduler not configured", { status: 503 });

  const provided =
    request.headers.get("x-cron-secret") ??
    (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");

  if (!provided || !safeEqual(provided, secret)) {
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}
