/**
 * Admin server functions — verification workflow and role management.
 * Every handler double-checks the caller's admin role against RLS-backed data
 * before performing privileged operations.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "super_admin"])
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

async function audit(
  supabase: any,
  actor: string,
  action: string,
  target: { table: string; id: string },
  meta?: Record<string, unknown>,
) {
  await supabase.from("audit_log").insert({
    actor_id: actor,
    action,
    target_table: target.table,
    target_id: target.id,
    meta: meta ?? {},
  });
}

export const adminListVendors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        status: z
          .enum(["pending", "approved", "rejected", "info_requested", "all"])
          .default("pending"),
        limit: z.number().int().min(1).max(100).default(50),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("vendors")
      .select(
        "id, slug, business_name, business_type, owner_id, owner_name, email, phone, city, country, verification_status, verification_notes, is_verified, submitted_at, created_at",
      )
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .limit(data.limit);
    if (data.status !== "all") q = q.eq("verification_status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminGetVendor = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("vendors")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const adminSetVendorStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["approved", "rejected", "info_requested", "pending"]),
        notes: z.string().max(2000).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const { data: row, error } = await context.supabase
      .from("vendors")
      .update({
        verification_status: data.status,
        verification_notes: data.notes ?? null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: context.userId,
        is_verified: data.status === "approved",
      })
      .eq("id", data.id)
      .select("id, owner_id, business_name, verification_status, is_verified")
      .single();
    if (error) throw new Error(error.message);

    // Grant/revoke the vendor role
    if (data.status === "approved") {
      await context.supabase
        .from("user_roles")
        .upsert(
          { user_id: row.owner_id, role: "vendor", granted_by: context.userId },
          { onConflict: "user_id,role" },
        );
    } else if (data.status === "rejected") {
      await context.supabase
        .from("user_roles")
        .delete()
        .eq("user_id", row.owner_id)
        .eq("role", "vendor");
    }

    await audit(
      context.supabase,
      context.userId,
      `vendor.${data.status}`,
      {
        table: "vendors",
        id: row.id,
      },
      { notes: data.notes ?? null },
    );

    return row;
  });

export const adminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const [pending, approved, rejected, subs] = await Promise.all([
      context.supabase
        .from("vendors")
        .select("id", { count: "exact", head: true })
        .eq("verification_status", "pending"),
      context.supabase
        .from("vendors")
        .select("id", { count: "exact", head: true })
        .eq("verification_status", "approved"),
      context.supabase
        .from("vendors")
        .select("id", { count: "exact", head: true })
        .eq("verification_status", "rejected"),
      context.supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .in("status", ["active", "trialing"]),
    ]);
    return {
      pending: pending.count ?? 0,
      approved: approved.count ?? 0,
      rejected: rejected.count ?? 0,
      active_subscriptions: subs.count ?? 0,
    };
  });
