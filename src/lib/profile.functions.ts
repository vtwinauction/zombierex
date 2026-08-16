/**
 * Profile server functions — authenticated, RLS-scoped.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const HandleSchema = z
  .string()
  .trim()
  .min(3)
  .max(24)
  .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, underscores only");

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data, error }, { data: contact }] = await Promise.all([
      context.supabase
        .from("profiles")
        .select(
          "id, handle, display_name, bio, avatar_url, cover_url, tier, is_verified, followers_count, following_count, posts_count, location, website, contact_dm_enabled, is_business, is_private, allow_messages",
        )
        .eq("id", context.userId)
        .maybeSingle(),
      context.supabase
        .from("profile_contacts")
        .select("contact_phone, contact_email, business_address")
        .eq("profile_id", context.userId)
        .maybeSingle(),
    ]);
    if (error) throw new Error(error.message);
    if (!data) return null;
    return {
      ...data,
      contact_phone: contact?.contact_phone ?? null,
      contact_email: contact?.contact_email ?? null,
      business_address: contact?.business_address ?? null,
    };
  });

export const getMyProfileMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const uid = context.userId;
    const [profileRes, vehicleRes, uaRes, achRes, contactRes] = await Promise.all([
      context.supabase
        .from("profiles")
        .select(
          "id, handle, display_name, bio, website, avatar_url, cover_url, location, tier, is_verified, is_premium, followers_count, following_count, posts_count, listings_count, xp_total, level, streak_days, contact_dm_enabled, is_business",
        )
        .eq("id", uid)
        .maybeSingle(),
      context.supabase
        .from("vehicles")
        .select("id, kind, make, model, year, nickname, spec, hero_image_url, is_primary")
        .eq("owner_id", uid)
        .is("deleted_at", null)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      context.supabase
        .from("user_achievements")
        .select("achievement_slug, progress, target, unlocked_at")
        .eq("user_id", uid),
      context.supabase.from("achievements").select("slug, title, description, tier, category"),
      context.supabase
        .from("profile_contacts")
        .select("contact_phone, contact_email, business_address")
        .eq("profile_id", uid)
        .maybeSingle(),
    ]);

    if (profileRes.error) throw new Error(profileRes.error.message);

    const profile = profileRes.data
      ? {
          ...profileRes.data,
          contact_phone: contactRes.data?.contact_phone ?? null,
          contact_email: contactRes.data?.contact_email ?? null,
          business_address: contactRes.data?.business_address ?? null,
        }
      : null;

    const vehicle = vehicleRes.data ?? null;
    const userAch = uaRes.data ?? [];
    const allAch = achRes.data ?? [];

    const earnedSlugs = new Set(
      userAch.filter((r) => r.unlocked_at).map((r) => r.achievement_slug),
    );

    return {
      profile,
      vehicle,
      earnedCount: earnedSlugs.size,
      totalAchievements: allAch.length,
      achievements: allAch.map((a) => ({
        slug: a.slug,
        title: a.title,
        detail: a.description,
        tier: a.tier,
        earned: earnedSlugs.has(a.slug),
      })),
    };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        handle: HandleSchema.optional(),
        display_name: z.string().trim().min(1).max(80).optional(),
        bio: z.string().trim().max(500).optional(),
        location: z.string().trim().max(120).optional(),
        website: z.string().trim().url().max(255).optional().or(z.literal("")),
        avatar_url: z.string().url().max(2048).optional().or(z.literal("")),
        cover_url: z.string().url().max(2048).optional().or(z.literal("")),
        contact_phone: z.string().trim().max(40).optional().or(z.literal("")),
        contact_email: z.string().trim().email().max(255).optional().or(z.literal("")),
        contact_dm_enabled: z.boolean().optional(),
        is_business: z.boolean().optional(),
        business_address: z.string().trim().max(240).optional().or(z.literal("")),
        is_private: z.boolean().optional(),
        allow_messages: z.enum(["everyone", "followers", "none"]).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { contact_phone, contact_email, business_address, ...rest } = data;
    const payload: Record<string, unknown> = { ...rest };
    if (data.website === "") payload.website = null;
    if (data.avatar_url === "") payload.avatar_url = null;
    if (data.cover_url === "") payload.cover_url = null;

    const { data: row, error } = await context.supabase
      .from("profiles")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(payload as any)
      .eq("id", context.userId)
      .select()
      .single();
    if (error) {
      if (error.code === "23505" && error.message.includes("profiles_handle_key")) {
        throw new Error("That username is already taken. Please choose another.");
      }
      throw new Error(error.message);
    }

    // Contact PII lives in its own table (not publicly readable).
    if (
      contact_phone !== undefined ||
      contact_email !== undefined ||
      business_address !== undefined
    ) {
      const contact: Record<string, unknown> = { profile_id: context.userId };
      if (contact_phone !== undefined) contact.contact_phone = contact_phone || null;
      if (contact_email !== undefined) contact.contact_email = contact_email || null;
      if (business_address !== undefined) contact.business_address = business_address || null;
      const { error: cErr } = await context.supabase
        .from("profile_contacts")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert(contact as any, { onConflict: "profile_id" });
      if (cErr) throw new Error(cErr.message);
    }

    return {
      ...row,
      contact_phone: contact_phone === undefined ? undefined : contact_phone || null,
      contact_email: contact_email === undefined ? undefined : contact_email || null,
      business_address: business_address === undefined ? undefined : business_address || null,
    };
  });

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => r.role);
  });

/**
 * Upsert the caller's primary vehicle — creates one if none exists, else
 * updates the primary vehicle. Powers the Digital Garage rename flow.
 */
export const upsertMyVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        nickname: z.string().trim().min(1).max(80).optional(),
        make: z.string().trim().min(1).max(60).optional(),
        model: z.string().trim().min(1).max(80).optional(),
        year: z.number().int().min(1900).max(2100).optional(),
        kind: z.enum(["motorcycle", "car", "truck", "scooter", "atv", "other"]).optional(),
        hero_image_url: z.string().url().max(2048).optional().or(z.literal("")),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const uid = context.userId;
    const { data: existing } = await context.supabase
      .from("vehicles")
      .select("id")
      .eq("owner_id", uid)
      .is("deleted_at", null)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const patch: Record<string, unknown> = {};
    if (data.nickname !== undefined) patch.nickname = data.nickname;
    if (data.make !== undefined) patch.make = data.make;
    if (data.model !== undefined) patch.model = data.model;
    if (data.year !== undefined) patch.year = data.year;
    if (data.kind !== undefined) patch.kind = data.kind;
    if (data.hero_image_url !== undefined)
      patch.hero_image_url = data.hero_image_url === "" ? null : data.hero_image_url;

    if (existing?.id) {
      const { data: row, error } = await context.supabase
        .from("vehicles")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(patch as any)
        .eq("id", existing.id)
        .eq("owner_id", uid)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return row;
    }

    const insert = {
      owner_id: uid,
      kind: (data.kind ?? "motorcycle") as string,
      make: data.make ?? "Custom",
      model: data.model ?? data.nickname ?? "My Ride",
      year: data.year ?? null,
      nickname: data.nickname ?? null,
      hero_image_url: patch.hero_image_url ?? null,
      is_primary: true,
    };
    const { data: row, error } = await context.supabase
      .from("vehicles")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(insert as any)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
