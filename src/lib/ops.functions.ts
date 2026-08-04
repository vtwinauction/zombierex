/**
 * Operations server functions — feature flags, platform settings,
 * maintenance mode, and health snapshot for the Platform Health dashboard.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "super_admin"])
    .limit(1)
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

export const listFeatureFlags = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
          h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data } = await client
    .from("feature_flags")
    .select("key, enabled, rollout_percent, description");
  return data ?? [];
});

export const adminSetFeatureFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        key: z.string().min(1),
        enabled: z.boolean().optional(),
        rollout_percent: z.number().int().min(0).max(100).optional(),
        description: z.string().max(500).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const patch: Record<string, unknown> = {};
    if (data.enabled !== undefined) patch.enabled = data.enabled;
    if (data.rollout_percent !== undefined) patch.rollout_percent = data.rollout_percent;
    if (data.description !== undefined) patch.description = data.description;
    const { error } = await context.supabase
      .from("feature_flags")
      .upsert({ key: data.key, ...patch }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetMaintenance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z.object({ enabled: z.boolean(), message: z.string().max(500).optional() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("platform_settings").upsert(
      {
        key: "maintenance_mode",
        value: { enabled: data.enabled, message: data.message ?? null },
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminHealthSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const [users, posts, listings, events, comms, reports, subs] = await Promise.all([
      context.supabase.from("profiles").select("id", { count: "exact", head: true }),
      context.supabase.from("posts").select("id", { count: "exact", head: true }),
      context.supabase.from("listings").select("id", { count: "exact", head: true }),
      context.supabase.from("events").select("id", { count: "exact", head: true }),
      context.supabase.from("clubs").select("id", { count: "exact", head: true }),
      context.supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
      context.supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .in("status", ["active", "trialing"]),
    ]);
    const { data: settings } = await context.supabase
      .from("platform_settings")
      .select("key, value");
    return {
      counts: {
        users: users.count ?? 0,
        posts: posts.count ?? 0,
        listings: listings.count ?? 0,
        events: events.count ?? 0,
        communities: comms.count ?? 0,
        reports_pending: reports.count ?? 0,
        subscriptions_active: subs.count ?? 0,
      },
      settings: Object.fromEntries((settings ?? []).map((s: any) => [s.key, s.value])),
      generated_at: new Date().toISOString(),
    };
  });
