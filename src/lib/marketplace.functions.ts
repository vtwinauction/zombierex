/**
 * Marketplace — Phase 9.
 * Listings, saves, reports, seller reviews, and lightweight seller analytics.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

/** Publishable-key server client for public reads (respects RLS as anon). */
function publicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(process.env.SUPABASE_URL!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
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
}

/** Read optional bearer token from the incoming request; returns userId or null. */
async function getOptionalUserId(): Promise<string | null> {
  try {
    const { getRequestHeader } = await import("@tanstack/start-server-core");
    const auth = getRequestHeader("authorization") || getRequestHeader("Authorization" as any);
    if (!auth?.toLowerCase().startsWith("bearer ")) return null;
    const token = auth.slice(7);
    const { data } = await publicClient().auth.getUser(token);
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export const LISTING_CATEGORIES = [
  "motorcycle",
  "car",
  "truck",
  "scooter",
  "atv",
  "other_vehicle",
  "parts",
  "accessories",
  "riding_gear",
  "apparel",
  "collectibles",
  "tools",
  "garage_equipment",
  "electronics",
  "services",
] as const;

export const LISTING_CONDITIONS = ["new", "like_new", "used", "for_parts", "refurbished"] as const;
export const LISTING_FUELS = ["gasoline", "diesel", "electric", "hybrid", "other", "na"] as const;
export const LISTING_TRANSMISSIONS = [
  "manual",
  "automatic",
  "semi_auto",
  "cvt",
  "dct",
  "na",
] as const;

const ListingInput = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(8000).optional().nullable(),
  category: z.enum(LISTING_CATEGORIES),
  subcategory: z.string().trim().max(80).optional().nullable(),
  brand: z.string().trim().max(80).optional().nullable(),
  model: z.string().trim().max(120).optional().nullable(),
  year: z.number().int().min(1900).max(2100).optional().nullable(),
  condition: z.enum(LISTING_CONDITIONS).default("used"),
  price_cents: z.number().int().min(0).max(999_999_999),
  currency: z.string().length(3).default("USD"),
  is_negotiable: z.boolean().default(true),
  fuel_type: z.enum(LISTING_FUELS).default("na"),
  transmission: z.enum(LISTING_TRANSMISSIONS).default("na"),
  engine_cc: z.number().int().min(0).max(20000).optional().nullable(),
  mileage_km: z.number().int().min(0).max(9_999_999).optional().nullable(),
  color: z.string().trim().max(40).optional().nullable(),
  vin: z.string().trim().max(40).optional().nullable(),
  location: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  region: z.string().trim().max(120).optional().nullable(),
  country: z.string().trim().max(80).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  hero_image_url: z.string().max(1000).optional().nullable(),
  tags: z.array(z.string().trim().max(40)).max(20).default([]),
  photos: z
    .array(
      z.object({
        url: z.string().min(1).max(1000),
        thumbnail_url: z.string().max(1000).optional().nullable(),
        is_video: z.boolean().default(false),
        width: z.number().int().optional().nullable(),
        height: z.number().int().optional().nullable(),
      }),
    )
    .max(30)
    .optional()
    .default([]),
});

/* ================= CREATE / UPDATE / DELETE ================= */
export const createListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => ListingInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { photos, ...row } = data;
    const insert: any = {
      ...row,
      seller_id: context.userId,
      status: "active" as const,
      published_at: new Date().toISOString(),
      hero_image_url: row.hero_image_url ?? photos?.[0]?.url ?? null,
    };
    const { data: created, error } = await context.supabase
      .from("listings")
      .insert(insert)
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (photos?.length) {
      await context.supabase
        .from("listing_photos")
        .insert(photos.map((p, i) => ({ ...p, listing_id: created.id, sort_order: i })));
    }
    return { id: created.id as string };
  });

export const updateListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        id: z.string().uuid(),
        patch: ListingInput.partial().omit({ photos: true }),
        status: z.enum(["active", "sold", "archived", "draft"]).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const patch: any = { ...data.patch };
    if (data.status) patch.status = data.status;
    if (data.status === "sold") patch.sold_at = new Date().toISOString();
    const { error } = await context.supabase
      .from("listings")
      .update(patch)
      .eq("id", data.id)
      .eq("seller_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("listings")
      .delete()
      .eq("id", data.id)
      .eq("seller_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ================= FETCH / SEARCH ================= */
const ListFilters = z.object({
  scope: z
    .enum(["featured", "trending", "new", "nearby", "recommended", "saved", "recent", "mine"])
    .default("new"),
  category: z.enum(LISTING_CATEGORIES).optional(),
  condition: z.enum(LISTING_CONDITIONS).optional(),
  fuel_type: z.enum(LISTING_FUELS).optional(),
  transmission: z.enum(LISTING_TRANSMISSIONS).optional(),
  brand: z.string().trim().max(80).optional(),
  model: z.string().trim().max(120).optional(),
  year_min: z.number().int().optional(),
  year_max: z.number().int().optional(),
  price_min: z.number().int().optional(),
  price_max: z.number().int().optional(),
  mileage_max: z.number().int().optional(),
  engine_min: z.number().int().optional(),
  engine_max: z.number().int().optional(),
  seller_id: z.string().uuid().optional(),
  city: z.string().trim().max(120).optional(),
  country: z.string().trim().max(80).optional(),
  search: z.string().trim().max(200).optional(),
  limit: z.number().int().min(1).max(60).default(24),
  offset: z.number().int().min(0).default(0),
});

const LISTING_SELECT =
  "id, seller_id, title, price_cents, currency, category, condition, brand, model, year, mileage_km, city, region, country, is_negotiable, is_featured, hero_image_url, saves_count, views_count, published_at, created_at, status";

export const listListings = createServerFn({ method: "GET" })
  .validator((raw) => ListFilters.parse(raw ?? {}))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const userId =
      data.scope === "mine" || data.scope === "saved" ? await getOptionalUserId() : null;
    if ((data.scope === "mine" || data.scope === "saved") && !userId) return [];

    const sel = (s: string): string => s;
    let q = sb
      .from("listings")
      .select(sel(LISTING_SELECT))
      .limit(data.limit)
      .range(data.offset, data.offset + data.limit - 1);

    if (data.scope === "mine") q = q.eq("seller_id", userId!);
    else q = q.eq("status", "active");

    if (data.scope === "featured")
      q = q.eq("is_featured", true).order("published_at", { ascending: false });
    else if (data.scope === "trending") q = q.order("views_count", { ascending: false });
    else if (data.scope === "recommended") q = q.order("saves_count", { ascending: false });
    else if (data.scope === "nearby") q = q.order("published_at", { ascending: false });
    else if (data.scope === "saved") {
      const { data: s } = await sb
        .from("listing_saves")
        .select("listing_id")
        .eq("user_id", userId!)
        .limit(200);
      const ids = (s ?? []).map((r: any) => r.listing_id);
      if (!ids.length) return [];
      q = sb
        .from("listings")
        .select(sel(LISTING_SELECT))
        .in("id", ids)
        .order("created_at", { ascending: false });
    } else q = q.order("published_at", { ascending: false });

    if (data.category) q = q.eq("category", data.category);
    if (data.condition) q = q.eq("condition", data.condition);
    if (data.fuel_type) q = q.eq("fuel_type", data.fuel_type);
    if (data.transmission) q = q.eq("transmission", data.transmission);
    if (data.brand) q = q.ilike("brand", `%${data.brand}%`);
    if (data.model) q = q.ilike("model", `%${data.model}%`);
    if (data.year_min != null) q = q.gte("year", data.year_min);
    if (data.year_max != null) q = q.lte("year", data.year_max);
    if (data.price_min != null) q = q.gte("price_cents", data.price_min);
    if (data.price_max != null) q = q.lte("price_cents", data.price_max);
    if (data.mileage_max != null) q = q.lte("mileage_km", data.mileage_max);
    if (data.engine_min != null) q = q.gte("engine_cc", data.engine_min);
    if (data.engine_max != null) q = q.lte("engine_cc", data.engine_max);
    if (data.seller_id) q = q.eq("seller_id", data.seller_id);
    if (data.city) q = q.ilike("city", `%${data.city}%`);
    if (data.country) q = q.ilike("country", `%${data.country}%`);
    if (data.search)
      q = q.or(
        `title.ilike.%${data.search}%,brand.ilike.%${data.search}%,model.ilike.%${data.search}%`,
      );

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getListing = createServerFn({ method: "GET" })
  .validator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const userId = await getOptionalUserId();
    const { data: row, error } = await sb
      .from("listings")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    const [{ data: photos }, { data: seller }, saveRes] = await Promise.all([
      sb.from("listing_photos").select("*").eq("listing_id", data.id).order("sort_order"),
      sb
        .from("profiles")
        .select(
          "id, handle, display_name, avatar_url, tier, is_verified, followers_count, seller_rating_avg, seller_reviews_count, listings_count, created_at",
        )
        .eq("id", row.seller_id)
        .maybeSingle(),
      userId
        ? sb
            .from("listing_saves")
            .select("listing_id")
            .eq("user_id", userId)
            .eq("listing_id", data.id)
            .maybeSingle()
        : Promise.resolve({ data: null } as any),
    ]);

    // Fire and forget view increment
    await sb
      .from("listings")
      .update({ views_count: (row.views_count ?? 0) + 1 })
      .eq("id", data.id);

    return { ...row, photos: photos ?? [], seller, saved_by_me: !!(saveRes as any)?.data };
  });

/* ================= SAVE / UNSAVE ================= */
export const toggleSaveListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("listing_saves")
      .select("listing_id")
      .eq("user_id", context.userId)
      .eq("listing_id", data.id)
      .maybeSingle();
    if (existing) {
      await context.supabase
        .from("listing_saves")
        .delete()
        .eq("user_id", context.userId)
        .eq("listing_id", data.id);
      return { saved: false };
    }
    await context.supabase
      .from("listing_saves")
      .insert({ user_id: context.userId, listing_id: data.id });
    return { saved: true };
  });

/* ================= REPORTS ================= */
export const reportListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        id: z.string().uuid(),
        reason: z.string().trim().min(2).max(80),
        note: z.string().trim().max(1000).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("listing_reports").insert({
      listing_id: data.id,
      reporter_id: context.userId,
      reason: data.reason,
      note: data.note ?? null,
    });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

/* ================= SELLER REVIEWS ================= */
export const submitSellerReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        seller_id: z.string().uuid(),
        listing_id: z.string().uuid().optional(),
        rating: z.number().int().min(1).max(5),
        body: z.string().trim().max(1000).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("seller_reviews").upsert(
      {
        seller_id: data.seller_id,
        reviewer_id: context.userId,
        listing_id: data.listing_id ?? null,
        rating: data.rating,
        body: data.body ?? null,
      },
      { onConflict: "seller_id,reviewer_id,listing_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listSellerReviews = createServerFn({ method: "GET" })
  .validator((raw) =>
    z
      .object({ seller_id: z.string().uuid(), limit: z.number().int().max(50).default(20) })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: rows, error } = await sb
      .from("seller_reviews")
      .select("*")
      .eq("seller_id", data.seller_id)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    const rids = Array.from(new Set((rows ?? []).map((r) => r.reviewer_id)));
    const { data: revs } = rids.length
      ? await sb.from("profiles").select("id, handle, display_name, avatar_url").in("id", rids)
      : { data: [] as any[] };
    const byId = new Map((revs ?? []).map((r) => [r.id, r]));
    return (rows ?? []).map((r) => ({ ...r, reviewer: byId.get(r.reviewer_id) ?? null }));
  });

/* ================= SELLER PROFILE ================= */
export const getSellerProfile = createServerFn({ method: "GET" })
  .validator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const userId = await getOptionalUserId();
    const sel = (s: string): string => s;
    const [{ data: profile }, { data: active }, followState] = await Promise.all([
      sb
        .from("profiles")
        .select(
          "id, handle, display_name, avatar_url, bio, tier, is_verified, followers_count, listings_count, seller_rating_avg, seller_reviews_count, created_at, location",
        )
        .eq("id", data.id)
        .maybeSingle(),
      sb
        .from("listings")
        .select(sel(LISTING_SELECT))
        .eq("seller_id", data.id)
        .eq("status", "active")
        .order("published_at", { ascending: false })
        .limit(30),
      userId
        ? sb
            .from("follows")
            .select("follower_id")
            .eq("follower_id", userId)
            .eq("followee_id", data.id)
            .maybeSingle()
        : Promise.resolve({ data: null } as any),
    ]);
    return { profile, active_listings: active ?? [], following: !!(followState as any)?.data };
  });

/* ================= SELLER DASHBOARD ================= */
export const getSellerDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sel = (s: string): string => s;
    const [{ data: rows }, { count: activeCount }, { count: soldCount }, { data: reviews }] =
      await Promise.all([
        context.supabase
          .from("listings")
          .select(sel(LISTING_SELECT))
          .eq("seller_id", context.userId)
          .order("created_at", { ascending: false })
          .limit(50),
        context.supabase
          .from("listings")
          .select("*", { count: "exact", head: true })
          .eq("seller_id", context.userId)
          .eq("status", "active"),
        context.supabase
          .from("listings")
          .select("*", { count: "exact", head: true })
          .eq("seller_id", context.userId)
          .eq("status", "sold"),
        context.supabase.from("seller_reviews").select("rating").eq("seller_id", context.userId),
      ]);

    const totalViews = (rows ?? []).reduce((s, r: any) => s + (r.views_count ?? 0), 0);
    const totalSaves = (rows ?? []).reduce((s, r: any) => s + (r.saves_count ?? 0), 0);
    const avgPrice = (rows ?? []).length
      ? Math.round((rows ?? []).reduce((s, r: any) => s + (r.price_cents ?? 0), 0) / rows!.length)
      : 0;
    const avgRating = (reviews ?? []).length
      ? (reviews ?? []).reduce((s, r: any) => s + r.rating, 0) / reviews!.length
      : 0;

    return {
      listings: rows ?? [],
      active_count: activeCount ?? 0,
      sold_count: soldCount ?? 0,
      total_views: totalViews,
      total_saves: totalSaves,
      avg_price_cents: avgPrice,
      avg_rating: Number(avgRating.toFixed(2)),
      reviews_count: (reviews ?? []).length,
    };
  });
