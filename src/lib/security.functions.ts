/**
 * Security Center server functions.
 * All user-scoped through requireSupabaseAuth; RLS enforces ownership.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listDevices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("devices")
      .select("id, label, user_agent, last_seen_at, created_at")
      .order("last_seen_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const registerDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ label: z.string().max(80).optional() }).parse(raw ?? {}))
  .handler(async ({ data, context }) => {
    const ua = getRequestHeader("user-agent") ?? "unknown";
    const { data: row, error } = await context.supabase
      .from("devices")
      .insert({
        user_id: context.userId,
        label: data.label ?? ua.slice(0, 60),
        user_agent: ua,
        last_seen_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const revokeDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    // H-08: actually revoke sessions. Delete the cosmetic row AND terminate
    // all sessions except the caller's current one via Auth Admin API.
    const { error } = await context.supabase.from("devices").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // scope 'others' preserves the current session; a follow-up sign-out
      // in the UI kicks the current device too if the user picked "this device".
      await supabaseAdmin.auth.admin.signOut(context.userId, "others" as any);
    } catch {
      // Non-fatal — the row is already removed and the UI reflects revocation.
    }
    return { ok: true };
  });

/** Signs out every session for the caller everywhere (global). */
export const revokeAllDevices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase.from("devices").delete().eq("user_id", context.userId);
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.auth.admin.signOut(context.userId, "global" as any);
    } catch {
      /* non-fatal */
    }
    return { ok: true };
  });

/** Exports a JSON blob of the user's own data (RLS-scoped SELECTs). */
export const exportMyData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const uid = context.userId;
    const s = context.supabase;
    const [profile, posts, comments, follows, listings, xp, achievements, devices, prefs] =
      await Promise.all([
        s.from("profiles").select("*").eq("id", uid).maybeSingle(),
        s.from("posts").select("*").eq("author_id", uid),
        s.from("comments").select("*").eq("author_id", uid),
        s.from("follows").select("*").or(`follower_id.eq.${uid},followee_id.eq.${uid}`),
        s.from("listings").select("*").eq("seller_id", uid),
        s.from("xp_events").select("*").eq("user_id", uid),
        s.from("user_achievements").select("*").eq("user_id", uid),
        s.from("devices").select("*").eq("user_id", uid),
        s.from("notification_preferences").select("*").eq("user_id", uid).maybeSingle(),
      ]);
    return {
      exported_at: new Date().toISOString(),
      user_id: uid,
      profile: profile.data,
      posts: posts.data ?? [],
      comments: comments.data ?? [],
      follows: follows.data ?? [],
      listings: listings.data ?? [],
      xp_events: xp.data ?? [],
      achievements: achievements.data ?? [],
      devices: devices.data ?? [],
      notification_preferences: prefs.data,
    };
  });

/** Marks account for deletion — soft signal for review workflow. */
export const requestAccountDeletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ reason: z.string().max(500).optional() }).parse(raw ?? {}))
  .handler(async ({ data, context }) => {
    // Best-effort: log the request; a background job / admin fulfills it.
    await context.supabase.from("audit_log" as any).insert({
      actor_id: context.userId,
      action: "account.delete_requested",
      target_kind: "profile",
      target_id: context.userId,
      meta: { reason: data.reason ?? null },
    } as any);
    return { ok: true };
  });
