/**
 * Push fanout — called every minute by pg_cron.
 *
 * Finds notifications with pushed_at IS NULL, resolves each recipient's
 * device tokens + notification preferences, sends via FCM (Android + iOS via
 * APNs-through-FCM), and marks the notification pushed. Permanently invalid
 * tokens are deleted so we don't spam retries.
 *
 * Guarded by the dedicated CRON_SECRET header (set by pg_cron). Route lives under
 * /api/public/* which bypasses auth at the edge; the apikey check makes it
 * abuse-resistant while still callable from pg_net.
 */
import { createFileRoute } from "@tanstack/react-router";
import { requireCronSecret } from "@/lib/cron-auth.server";
import { sendPush, isPermanentPushFailure } from "@/lib/push.server";

const BATCH = 200;

function titleFor(kind: string, payload: Record<string, unknown> | null): string {
  const p = payload ?? {};
  const actor = (p.actor_name as string) || (p.from as string) || "Someone";
  switch (kind) {
    case "like": return `${actor} liked your post`;
    case "comment": return `${actor} commented on your post`;
    case "follow": return `${actor} followed you`;
    case "mention": return `${actor} mentioned you`;
    case "message": return `${actor} sent you a message`;
    case "marketplace": return "Marketplace update";
    case "booking": return "Booking update";
    case "order": return "Order update";
    case "event": return "Event update";
    case "vendor_update": return "Vendor update";
    case "subscription": return "Subscription update";
    default: return "ZOMBIEREX";
  }
}

function bodyFor(payload: Record<string, unknown> | null): string {
  const p = payload ?? {};
  return (p.body as string) || (p.text as string) || (p.title as string) || "";
}

function pathFor(kind: string, payload: Record<string, unknown> | null): string | undefined {
  const p = payload ?? {};
  if (p.path && typeof p.path === "string") return p.path;
  if (p.post_id) return `/post/${p.post_id}`;
  if (p.thread_id) return `/inbox/${p.thread_id}`;
  if (p.event_id) return `/events`;
  if (p.listing_id) return `/marketplace/${p.listing_id}`;
  if (p.actor_handle) return `/u/${p.actor_handle}`;
  if (kind === "follow" && p.actor_id) return `/u/${p.actor_id}`;
  return "/notifications";
}

// Notification kind → preference column key on notification_preferences.
const KIND_PREF: Record<string, string> = {
  like: "likes",
  comment: "comments",
  follow: "follows",
  mention: "mentions",
  message: "messages",
  marketplace: "marketplace",
  booking: "bookings",
  order: "orders",
  event: "events",
  vendor_update: "vendor_updates",
  subscription: "subscriptions",
};

export const Route = createFileRoute("/api/public/hooks/fanout-push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = requireCronSecret(request);
        if (denied) return denied;

        // Skip if FCM isn't configured — return 200 so cron doesn't alarm.
        if (!process.env.FCM_SERVICE_ACCOUNT_JSON) {
          return Response.json({ ok: true, skipped: "fcm_not_configured" });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: pending, error } = await supabaseAdmin
          .from("notifications")
          .select("id, user_id, kind, payload")
          .is("pushed_at", null)
          .order("created_at", { ascending: true })
          .limit(BATCH);
        if (error) return new Response(`db: ${error.message}`, { status: 500 });
        if (!pending || pending.length === 0) return Response.json({ ok: true, sent: 0 });

        const userIds = Array.from(new Set(pending.map((n) => n.user_id)));

        const [{ data: prefs }, { data: tokens }] = await Promise.all([
          supabaseAdmin.from("notification_preferences").select("*").in("user_id", userIds),
          supabaseAdmin.from("device_tokens").select("user_id, token, platform").in("user_id", userIds),
        ]);

        const prefsByUser = new Map<string, Record<string, unknown>>(
          (prefs ?? []).map((p) => [p.user_id, p as unknown as Record<string, unknown>]),
        );
        const tokensByUser = new Map<string, { token: string; platform: string }[]>();
        for (const t of tokens ?? []) {
          const arr = tokensByUser.get(t.user_id) ?? [];
          arr.push({ token: t.token, platform: t.platform });
          tokensByUser.set(t.user_id, arr);
        }

        const staleTokens = new Set<string>();
        const pushedIds: string[] = [];
        let sent = 0;
        let skipped = 0;

        for (const n of pending) {
          const pref = prefsByUser.get(n.user_id);
          if (pref && pref.push_enabled === false) { pushedIds.push(n.id); skipped++; continue; }
          const prefKey = KIND_PREF[n.kind];
          if (pref && prefKey && pref[prefKey] === false) { pushedIds.push(n.id); skipped++; continue; }

          const deviceList = tokensByUser.get(n.user_id) ?? [];
          if (deviceList.length === 0) { pushedIds.push(n.id); skipped++; continue; }

          const payload = (n.payload ?? {}) as Record<string, unknown>;
          const title = titleFor(n.kind, payload);
          const body = bodyFor(payload);
          const path = pathFor(n.kind, payload);

          for (const d of deviceList) {
            try {
              const r = await sendPush({
                token: d.token,
                title,
                body,
                path,
                data: { notification_id: n.id, kind: n.kind },
              });
              if (r.ok) sent++;
              else if (isPermanentPushFailure(r)) staleTokens.add(d.token);
            } catch {
              // transient; leave notification unpushed so we retry next tick
            }
          }
          pushedIds.push(n.id);
        }

        if (pushedIds.length) {
          await supabaseAdmin
            .from("notifications")
            .update({ pushed_at: new Date().toISOString() })
            .in("id", pushedIds);
        }
        if (staleTokens.size) {
          await supabaseAdmin.from("device_tokens").delete().in("token", Array.from(staleTokens));
        }

        return Response.json({
          ok: true,
          processed: pending.length,
          sent,
          skipped,
          stale_removed: staleTokens.size,
        });
      },
    },
  },
});
