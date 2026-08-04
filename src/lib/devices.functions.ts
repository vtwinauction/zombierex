/**
 * Devices + test push — auth required.
 * List/revoke the current user's registered push tokens and fire a
 * one-off test push to all of them.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyDevices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("device_tokens")
      .select("id, platform, token, created_at, updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((d) => ({
      ...d,
      token_preview: `${d.token.slice(0, 8)}…${d.token.slice(-6)}`,
    }));
  });

export const revokeMyDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("device_tokens")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: tokens, error } = await context.supabase
      .from("device_tokens")
      .select("token")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    if (!tokens || tokens.length === 0) {
      return { ok: false, sent: 0, reason: "no_devices" as const };
    }
    if (!process.env.FCM_SERVICE_ACCOUNT_JSON) {
      return { ok: false, sent: 0, reason: "fcm_not_configured" as const };
    }
    const { sendPush, isPermanentPushFailure } = await import("./push.server");
    let sent = 0;
    const stale: string[] = [];
    for (const t of tokens) {
      const r = await sendPush({
        token: t.token,
        title: "ZOMBIEREX",
        body: "Test notification — push is working ✅",
        path: "/notifications",
        data: { kind: "test" },
      });
      if (r.ok) sent++;
      else if (isPermanentPushFailure(r)) stale.push(t.token);
    }
    if (stale.length) {
      await context.supabase.from("device_tokens").delete().in("token", stale);
    }
    return {
      ok: sent > 0,
      sent,
      stale: stale.length,
      reason: sent > 0 ? ("sent" as const) : ("all_failed" as const),
    };
  });
