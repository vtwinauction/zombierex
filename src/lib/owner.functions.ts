/**
 * Owner (Super Administrator) server functions.
 *
 * Every handler:
 *   1. requireSupabaseAuth  → validates the caller's session
 *   2. assertOwner()        → verifies the caller has the 'owner' role
 *   3. writes to owner_audit_log with before/after state
 *
 * Read-only helpers still perform the owner check but only record
 * high-signal actions (never per-page reads) to keep the log usable.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertOwner(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("is_owner", { _user: userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden — owner only");
}

async function audit(
  supabase: any,
  actor: string,
  action: string,
  target_type: string | null,
  target_id: string | null,
  before_value: unknown = null,
  after_value: unknown = null,
) {
  try {
    await supabase.from("owner_audit_log").insert({
      actor_id: actor,
      action,
      target_type,
      target_id,
      before_value: (before_value as any) ?? null,
      after_value: (after_value as any) ?? null,
    });
  } catch (e) {
    console.error("[owner audit] failed", e);
  }
}

// ─────────────────────────────────────────────────────────────
// IDENTITY
// ─────────────────────────────────────────────────────────────

export const checkOwner = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("is_owner", { _user: context.userId });
    return { isOwner: !!data, userId: context.userId };
  });

// ─────────────────────────────────────────────────────────────
// LIVE METRICS
// ─────────────────────────────────────────────────────────────

export const getOwnerMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwner(context.supabase, context.userId);
    const sb = context.supabase;
    const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

    const [users, posts24, listings, msgs24, signups24, suspended, reports, broadcasts] = await Promise.all([
      sb.from("profiles").select("id", { count: "exact", head: true }),
      sb.from("posts").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
      sb.from("listings").select("id", { count: "exact", head: true }).eq("status", "active"),
      sb.from("messages").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
      sb.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
      sb.from("profiles").select("id", { count: "exact", head: true }).eq("is_suspended", true),
      sb.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
      sb.from("owner_broadcasts").select("id", { count: "exact", head: true }).eq("active", true),
    ]);

    const activeSince = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const { count: weeklyActive } = await sb
      .from("posts")
      .select("author_id", { count: "exact", head: true })
      .gte("created_at", weekAgo);

    return {
      totalUsers: users.count ?? 0,
      posts24h: posts24.count ?? 0,
      activeListings: listings.count ?? 0,
      messages24h: msgs24.count ?? 0,
      signups24h: signups24.count ?? 0,
      suspendedUsers: suspended.count ?? 0,
      openReports: reports.count ?? 0,
      activeBroadcasts: broadcasts.count ?? 0,
      weeklyActive: weeklyActive ?? 0,
      generatedAt: new Date().toISOString(),
      _activeSince: activeSince,
    };
  });

// ─────────────────────────────────────────────────────────────
// FEATURE FLAGS
// ─────────────────────────────────────────────────────────────

export const listOwnerFlags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwner(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("feature_flags_v2")
      .select("*")
      .order("category")
      .order("label");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setFeatureFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z.object({ key: z.string().min(1), enabled: z.boolean() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    const { data: before } = await context.supabase
      .from("feature_flags_v2").select("*").eq("key", data.key).maybeSingle();
    if (!before) throw new Error("Unknown feature flag");
    const { data: after, error } = await context.supabase
      .from("feature_flags_v2")
      .update({ enabled: data.enabled, updated_by: context.userId, updated_at: new Date().toISOString() })
      .eq("key", data.key)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await audit(context.supabase, context.userId, "flag.set", "feature_flag", data.key, before, after);
    return after;
  });

// ─────────────────────────────────────────────────────────────
// MAINTENANCE
// ─────────────────────────────────────────────────────────────

export const getMaintenance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwner(context.supabase, context.userId);
    const [globalRow, modules] = await Promise.all([
      context.supabase.from("maintenance_state").select("*").eq("id", 1).maybeSingle(),
      context.supabase.from("module_maintenance").select("*"),
    ]);
    return { global: globalRow.data, modules: modules.data ?? [] };
  });

export const setGlobalMaintenance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z.object({
      enabled: z.boolean(),
      message: z.string().max(500).nullable().optional(),
      scheduledUntil: z.string().datetime().nullable().optional(),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    const { data: before } = await context.supabase.from("maintenance_state").select("*").eq("id", 1).maybeSingle();
    const { data: after, error } = await context.supabase
      .from("maintenance_state")
      .update({
        global_enabled: data.enabled,
        message: data.message ?? null,
        scheduled_until: data.scheduledUntil ?? null,
        updated_by: context.userId,
      })
      .eq("id", 1).select("*").single();
    if (error) throw new Error(error.message);
    await audit(context.supabase, context.userId, "maintenance.global", "maintenance_state", "1", before, after);
    return after;
  });

export const setModuleMaintenance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z.object({ moduleKey: z.string(), enabled: z.boolean(), message: z.string().max(500).nullable().optional() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    const { data: before } = await context.supabase
      .from("module_maintenance").select("*").eq("module_key", data.moduleKey).maybeSingle();
    const { data: after, error } = await context.supabase
      .from("module_maintenance")
      .upsert(
        {
          module_key: data.moduleKey,
          enabled: data.enabled,
          message: data.message ?? null,
          updated_by: context.userId,
        },
        { onConflict: "module_key" },
      )
      .select("*").single();
    if (error) throw new Error(error.message);
    await audit(context.supabase, context.userId, "maintenance.module", "module_maintenance", data.moduleKey, before, after);
    return after;
  });

// ─────────────────────────────────────────────────────────────
// USER MANAGEMENT
// ─────────────────────────────────────────────────────────────

export const listUsersForOwner = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z.object({
      search: z.string().max(200).optional(),
      onlySuspended: z.boolean().optional(),
      onlyVerified: z.boolean().optional(),
      limit: z.number().int().min(1).max(200).default(50),
      offset: z.number().int().min(0).default(0),
    }).parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    let q = context.supabase
      .from("profiles")
      .select("id, display_name, handle, avatar_url, is_verified, is_suspended, is_premium, xp_total, level, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.search) {
      const term = `%${data.search.trim()}%`;
      q = q.or(`display_name.ilike.${term},handle.ilike.${term}`);
    }
    if (data.onlySuspended) q = q.eq("is_suspended", true);
    if (data.onlyVerified) q = q.eq("is_verified", true);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], count: count ?? 0 };
  });

export const setUserSuspension = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z.object({ userId: z.string().uuid(), suspend: z.boolean(), reason: z.string().max(500).optional() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    if (data.userId === context.userId) throw new Error("Cannot suspend yourself");
    const { data: before } = await context.supabase.from("profiles").select("*").eq("id", data.userId).maybeSingle();
    const patch = {
      is_suspended: data.suspend,
      suspended_reason: data.suspend ? (data.reason ?? null) : null,
      suspended_at: data.suspend ? new Date().toISOString() : null,
      suspended_by: data.suspend ? context.userId : null,
    };
    const { data: after, error } = await (context.supabase as any)
      .from("profiles").update(patch).eq("id", data.userId).select("*").single();
    if (error) throw new Error(error.message);
    await audit(context.supabase, context.userId, data.suspend ? "user.suspend" : "user.unsuspend", "profile", data.userId, before, after);
    return after;

  });

export const setUserVerified = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ userId: z.string().uuid(), verified: z.boolean() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    const patch = {
      is_verified: data.verified,
      verified_at: data.verified ? new Date().toISOString() : null,
      verified_by: data.verified ? context.userId : null,
    };
    const { data: after, error } = await context.supabase
      .from("profiles").update(patch).eq("id", data.userId).select("*").single();
    if (error) throw new Error(error.message);
    await audit(context.supabase, context.userId, data.verified ? "user.verify" : "user.unverify", "profile", data.userId, null, after);
    return after;
  });

export const setUserRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z.object({
      userId: z.string().uuid(),
      roles: z.array(z.enum(["owner", "admin", "moderator", "standard", "super_admin"])),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    const { data: before } = await context.supabase.from("user_roles").select("role").eq("user_id", data.userId);
    // Wipe and re-insert (trigger will refuse if we'd remove the last owner)
    await context.supabase.from("user_roles").delete().eq("user_id", data.userId);
    if (data.roles.length > 0) {
      const rows = data.roles.map((r) => ({ user_id: data.userId, role: r }));
      const { error } = await context.supabase.from("user_roles").insert(rows);
      if (error) {
        // roll back would need a transaction; try re-inserting original
        if (before) await context.supabase.from("user_roles").insert((before as any[]).map(r => ({ user_id: data.userId, role: r.role })));
        throw new Error(error.message);
      }
    }
    await audit(context.supabase, context.userId, "user.roles", "profile", data.userId, before, data.roles);
    return { userId: data.userId, roles: data.roles };
  });

// ─────────────────────────────────────────────────────────────
// BROADCASTS
// ─────────────────────────────────────────────────────────────

export const listBroadcasts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwner(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("owner_broadcasts").select("*").order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z.object({
      title: z.string().min(1).max(120),
      body: z.string().min(1).max(2000),
      severity: z.enum(["info", "warning", "critical"]).default("info"),
      expiresAt: z.string().datetime().nullable().optional(),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("owner_broadcasts")
      .insert({
        title: data.title, body: data.body, severity: data.severity,
        expires_at: data.expiresAt ?? null, active: true, created_by: context.userId,
      })
      .select("*").single();
    if (error) throw new Error(error.message);
    await audit(context.supabase, context.userId, "broadcast.create", "broadcast", row.id, null, row);
    return row;
  });

export const dismissBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("owner_broadcasts").update({ active: false }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context.supabase, context.userId, "broadcast.dismiss", "broadcast", data.id);
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────
// CONTENT MODERATION
// ─────────────────────────────────────────────────────────────

export const listRecentPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ limit: z.number().int().min(1).max(200).default(50), search: z.string().optional() }).parse(raw ?? {}))
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    let q = (context.supabase as any)
      .from("posts")
      .select("id, author_id, caption, media_urls, likes_count, comments_count, created_at, is_hidden")

      .order("created_at", { ascending: false }).limit(data.limit);
    if (data.search) q = q.ilike("caption", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const setPostHidden = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ postId: z.string().uuid(), hidden: z.boolean() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    const { data: before } = await (context.supabase as any).from("posts").select("id, is_hidden").eq("id", data.postId).maybeSingle();
    const { error } = await (context.supabase as any).from("posts").update({ is_hidden: data.hidden }).eq("id", data.postId);

    if (error) throw new Error(error.message);
    await audit(context.supabase, context.userId, data.hidden ? "post.hide" : "post.restore", "post", data.postId, before, { is_hidden: data.hidden });
    return { ok: true };
  });

export const listOpenReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwner(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("reports")
      .select("id, reporter_id, target_type, target_id, reason, status, created_at")
      .eq("status", "open").order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const resolveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ id: z.string().uuid(), action: z.enum(["dismiss", "action_taken"]) }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("reports").update({ status: data.action === "dismiss" ? "dismissed" : "resolved" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context.supabase, context.userId, `report.${data.action}`, "report", data.id);
    return { ok: true };
  });

// ─────────────────────────────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────────────────────────────

export const listAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z.object({
      search: z.string().max(200).optional(),
      action: z.string().optional(),
      limit: z.number().int().min(1).max(500).default(100),
      offset: z.number().int().min(0).default(0),
    }).parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    let q = context.supabase
      .from("owner_audit_log").select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.action) q = q.eq("action", data.action);
    if (data.search) {
      const term = `%${data.search}%`;
      q = q.or(`action.ilike.${term},target_type.ilike.${term},target_id.ilike.${term}`);
    }
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], count: count ?? 0 };
  });
