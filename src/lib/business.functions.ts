/**
 * Phase 10 — Business (verified vendor) profile server functions.
 * Public reads via publishable client; owner-only mutations via requireSupabaseAuth.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

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

const VENDOR_PUBLIC_COLS =
  "id, slug, business_name, business_type, description, logo_url, cover_url, website, phone, email, " +
  "address_line1, city, region, country, socials, operating_hours, service_areas, is_verified, " +
  "is_premium, gallery, portfolio, services_showcase, products_showcase, contact_channels, " +
  "followers_count, profile_views_count, created_at";

/* ================= PUBLIC PROFILE ================= */

export const getBusinessBySlug = createServerFn({ method: "GET" })
  .validator((raw) => z.object({ slug: z.string().trim().min(1).max(64) }).parse(raw))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: v, error } = await sb
      .from("vendors_public" as any)
      .select(VENDOR_PUBLIC_COLS)
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!v) return null;

    const [{ data: reviews }, { data: reviewSummary }] = await Promise.all([
      sb
        .from("business_reviews")
        .select("id, rating, body, reviewer_id, created_at")
        .eq("vendor_id", (v as any).id)
        .order("created_at", { ascending: false })
        .limit(20),
      sb
        .from("business_reviews")
        .select("rating")
        .eq("vendor_id", (v as any).id),
    ]);
    const ratings = (reviewSummary ?? []).map((r: any) => r.rating);
    const avg = ratings.length
      ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length
      : 0;

    return {
      vendor: v,
      reviews: reviews ?? [],
      review_stats: { count: ratings.length, avg: Number(avg.toFixed(2)) },
    };
  });

/* ================= BUSINESS DASHBOARD ANALYTICS ================= */

export const getBusinessDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: vendor } = await context.supabase
      .from("vendors")
      .select("*")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!vendor) return { vendor: null };

    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const [{ data: reviews }, { data: campaigns }, { data: events }, { data: posts }] =
      await Promise.all([
        context.supabase
          .from("business_reviews")
          .select("rating, created_at")
          .eq("vendor_id", vendor.id),
        context.supabase
          .from("ad_campaigns")
          .select(
            "id, status, impressions_count, clicks_count, engagements_count, budget_total_cents, spent_cents",
          )
          .eq("vendor_id", vendor.id),
        context.supabase
          .from("ad_events")
          .select("kind, placement, created_at")
          .in(
            "campaign_id",
            (
              (await context.supabase.from("ad_campaigns").select("id").eq("vendor_id", vendor.id))
                .data ?? []
            ).map((c: any) => c.id),
          )
          .gte("created_at", since)
          .limit(2000),
        context.supabase
          .from("posts")
          .select("id, likes_count, comments_count, shares_count")
          .eq("author_id", context.userId)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

    const ratings = (reviews ?? []).map((r: any) => r.rating);
    const avgRating = ratings.length
      ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length
      : 0;

    const engagement = (posts ?? []).reduce(
      (s, p: any) => s + (p.likes_count ?? 0) + (p.comments_count ?? 0) + (p.shares_count ?? 0),
      0,
    );
    const ads = (campaigns ?? []).reduce(
      (s, c: any) => ({
        impressions: s.impressions + (c.impressions_count ?? 0),
        clicks: s.clicks + (c.clicks_count ?? 0),
        spent_cents: s.spent_cents + (c.spent_cents ?? 0),
        budget_cents: s.budget_cents + (c.budget_total_cents ?? 0),
        active: s.active + (c.status === "active" ? 1 : 0),
      }),
      { impressions: 0, clicks: 0, spent_cents: 0, budget_cents: 0, active: 0 },
    );

    // Group events by day
    const byDay: Record<string, number> = {};
    for (const e of events ?? []) {
      const d = (e.created_at as string).slice(0, 10);
      byDay[d] = (byDay[d] ?? 0) + 1;
    }

    return {
      vendor,
      insights: {
        followers: vendor.followers_count ?? 0,
        profile_views: vendor.profile_views_count ?? 0,
        review_count: ratings.length,
        avg_rating: Number(avgRating.toFixed(2)),
        post_engagement: engagement,
        posts_count: (posts ?? []).length,
        is_premium: vendor.is_premium,
      },
      ads,
      recent_activity: Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, count]) => ({ day, count })),
    };
  });

/* ================= UPDATE SHOWCASE ================= */

const ShowcaseItem = z.object({
  title: z.string().trim().max(120),
  description: z.string().trim().max(500).optional(),
  image_url: z.string().trim().url().max(500).optional(),
  url: z.string().trim().url().max(500).optional(),
});

export const updateBusinessShowcase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        gallery: z.array(z.string().url()).max(30).optional(),
        portfolio: z.array(ShowcaseItem).max(20).optional(),
        services_showcase: z.array(ShowcaseItem).max(20).optional(),
        products_showcase: z.array(ShowcaseItem).max(20).optional(),
        contact_channels: z.record(z.string(), z.string().max(200)).optional(),
        operating_hours: z.record(z.string(), z.string().max(60)).optional(),
        website: z.string().url().max(255).optional(),
        phone: z.string().max(40).optional(),
        email: z.string().email().max(255).optional(),
        description: z.string().max(2000).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const patch: any = {};
    for (const [k, v] of Object.entries(data)) if (v !== undefined) patch[k] = v;
    const { error } = await context.supabase
      .from("vendors")
      .update(patch)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ================= BUSINESS REVIEWS ================= */

export const submitBusinessReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        vendor_id: z.string().uuid(),
        rating: z.number().int().min(1).max(5),
        body: z.string().trim().max(1000).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("business_reviews").upsert(
      {
        vendor_id: data.vendor_id,
        reviewer_id: context.userId,
        rating: data.rating,
        body: data.body ?? null,
      } as any,
      { onConflict: "vendor_id,reviewer_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
