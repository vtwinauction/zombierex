/**
 * Trust & safety server functions — reports, blocks, mutes, appeals,
 * admin moderation queue, and moderation actions (warn/suspend/ban).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "super_admin", "moderator"])
    .limit(1)
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

/* ---------------- User-side ---------------- */

export const submitReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        target_kind: z.enum([
          "post", "reel", "story", "comment", "message", "profile",
          "community", "event", "listing",
        ]),
        target_id: z.string().uuid(),
        reason: z.enum([
          "spam", "scam", "harassment", "hate", "violence", "nudity",
          "self_harm", "impersonation", "copyright", "misinformation", "other",
        ]),
        details: z.string().max(2000).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("reports").insert({
      reporter_id: context.userId,
      target_kind: data.target_kind,
      target_id: data.target_id,
      reason: data.reason,
      details: data.details ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const blockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ user_id: z.string().uuid(), reason: z.string().max(500).optional() }).parse(raw))
  .handler(async ({ data, context }) => {
    if (data.user_id === context.userId) throw new Error("Cannot block yourself");
    const { error } = await (context.supabase as any)
      .from("user_blocks")
      .upsert({ blocker_id: context.userId, blocked_id: data.user_id, reason: data.reason ?? null },
        { onConflict: "blocker_id,blocked_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unblockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ user_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("user_blocks").delete()
      .eq("blocker_id", context.userId).eq("blocked_id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const muteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ user_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    if (data.user_id === context.userId) throw new Error("Cannot mute yourself");
    const { error } = await (context.supabase as any).from("user_mutes")
      .upsert({ muter_id: context.userId, muted_id: data.user_id }, { onConflict: "muter_id,muted_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyBlocks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("user_blocks")
      .select("id, blocked_id, reason, created_at")
      .eq("blocker_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const submitAppeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ action_id: z.string().uuid().optional(), message: z.string().min(20).max(4000) }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("appeals").insert({
      user_id: context.userId,
      action_id: data.action_id ?? null,
      message: data.message,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertKeywordFilter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z.object({
      keyword: z.string().min(1).max(120),
      match_type: z.enum(["contains", "exact", "regex"]).default("contains"),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("keyword_filters").insert({
      user_id: context.userId, scope: "user",
      keyword: data.keyword.trim().toLowerCase(),
      match_type: data.match_type,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeKeywordFilter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("keyword_filters").delete()
      .eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyKeywordFilters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("keyword_filters")
      .select("id, keyword, match_type, created_at")
      .eq("user_id", context.userId)
      .eq("scope", "user")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/* ---------------- Admin ---------------- */

export const adminListReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z.object({
      status: z.enum(["open", "reviewing", "resolved", "dismissed", "all"]).default("open"),
      limit: z.number().int().min(1).max(200).default(100),
    }).parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = (context.supabase as any)
      .from("reports")
      .select("id, reporter_id, target_kind, target_id, reason, details, status, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminResolveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["reviewing", "resolved", "dismissed"]),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await (context.supabase as any).from("reports")
      .update({ status: data.status, resolved_by: context.userId })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await (context.supabase as any).from("audit_log").insert({
      actor_id: context.userId,
      action: `report.${data.status}`,
      target_kind: "reports",
      target_id: data.id,
    });
    return { ok: true };
  });

export const adminModerateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z.object({
      target_user_id: z.string().uuid(),
      action: z.enum(["warn", "suspend", "ban", "restore", "shadow_ban"]),
      reason: z.string().max(2000).optional(),
      duration_hours: z.number().int().min(1).max(24 * 365).optional(),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const expires_at = data.duration_hours
      ? new Date(Date.now() + data.duration_hours * 3600_000).toISOString()
      : null;
    const { data: row, error } = await (context.supabase as any).from("moderation_actions").insert({
      target_user_id: data.target_user_id,
      target_kind: "user",
      target_id: data.target_user_id,
      action: data.action,
      reason: data.reason ?? null,
      duration_hours: data.duration_hours ?? null,
      expires_at,
      issued_by: context.userId,
    }).select("id").single();
    if (error) throw new Error(error.message);
    await (context.supabase as any).from("audit_log").insert({
      actor_id: context.userId,
      action: `moderate.${data.action}`,
      target_kind: "profiles",
      target_id: data.target_user_id,
      meta: { reason: data.reason ?? null, duration_hours: data.duration_hours ?? null },
    });
    return { id: row.id };
  });

export const adminModerationQueueStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const [open, reviewing, appeals, active] = await Promise.all([
      (context.supabase as any).from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
      (context.supabase as any).from("reports").select("id", { count: "exact", head: true }).eq("status", "reviewing"),
      (context.supabase as any).from("appeals").select("id", { count: "exact", head: true }).eq("status", "pending"),
      (context.supabase as any).from("moderation_actions").select("id", { count: "exact", head: true }).eq("status", "active"),
    ]);
    return {
      reports_open: open.count ?? 0,
      reports_reviewing: reviewing.count ?? 0,
      appeals_pending: appeals.count ?? 0,
      active_sanctions: active.count ?? 0,
    };
  });
