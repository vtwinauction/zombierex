/**
 * Phase 10 — Ads Manager + Advertising Platform server functions.
 * Public reads for active creatives (sponsored slots) via publishable client.
 * Authenticated CRUD for owners on campaigns & creatives.
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
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const AD_OBJECTIVES = [
  { code: "followers", label: "Grow followers" },
  { code: "profile_visits", label: "Profile visits" },
  { code: "post_engagement", label: "Post engagement" },
  { code: "event_attendance", label: "Event attendance" },
  { code: "listing_views", label: "Listing views" },
  { code: "website_visits", label: "Website visits" },
  { code: "direct_messages", label: "Direct messages" },
] as const;

export const AD_PLACEMENTS = [
  { code: "feed", label: "Home feed" },
  { code: "reels", label: "Reels" },
  { code: "stories", label: "Stories" },
  { code: "explore", label: "Explore" },
  { code: "marketplace", label: "Marketplace" },
  { code: "communities", label: "Communities" },
  { code: "search", label: "Search" },
] as const;

export const AD_CREATIVE_KINDS = [
  "post", "reel", "story", "event", "listing", "community", "business_profile", "creator_profile",
] as const;

const ObjectiveEnum = z.enum(AD_OBJECTIVES.map(o => o.code) as [string, ...string[]]);
const PlacementEnum = z.enum(AD_PLACEMENTS.map(p => p.code) as [string, ...string[]]);
const KindEnum = z.enum(AD_CREATIVE_KINDS as unknown as [string, ...string[]]);

/* =========================== CAMPAIGN CRUD =========================== */

const CampaignInput = z.object({
  name: z.string().trim().min(2).max(120),
  objective: ObjectiveEnum,
  vendor_id: z.string().uuid().nullable().optional(),
  budget_total_cents: z.number().int().min(100),
  budget_daily_cents: z.number().int().min(0).default(0),
  currency: z.string().length(3).default("usd"),
  start_at: z.string().datetime().nullable().optional(),
  end_at: z.string().datetime().nullable().optional(),
  placements: z.array(PlacementEnum).min(1),
  geo_countries: z.array(z.string().trim().min(2).max(80)).max(30).default([]),
  geo_cities: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  interests: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  age_min: z.number().int().min(13).max(99).nullable().optional(),
  age_max: z.number().int().min(13).max(99).nullable().optional(),
});

const CreativeInput = z.object({
  kind: KindEnum,
  ref_id: z.string().uuid().nullable().optional(),
  headline: z.string().trim().max(120).optional(),
  body: z.string().trim().max(500).optional(),
  cta_label: z.string().trim().max(40).optional(),
  cta_url: z.string().trim().url().max(500).optional(),
  media_url: z.string().trim().url().max(500).optional(),
});

export const createCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({
    campaign: CampaignInput,
    creative: CreativeInput,
  }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: camp, error } = await context.supabase.from("ad_campaigns").insert({
      owner_id: context.userId,
      ...(data.campaign as any),
      status: "draft",
    } as any).select().single();
    if (error) throw new Error(error.message);
    const { error: cErr } = await context.supabase.from("ad_creatives").insert({
      campaign_id: camp.id, ...(data.creative as any),
    } as any);
    if (cErr) throw new Error(cErr.message);
    return camp;
  });

export const listMyCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ad_campaigns").select("*")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getCampaign = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const [{ data: camp, error }, { data: creatives }, { data: recent }] = await Promise.all([
      context.supabase.from("ad_campaigns").select("*").eq("id", data.id).maybeSingle(),
      context.supabase.from("ad_creatives").select("*").eq("campaign_id", data.id).order("sort_order"),
      context.supabase.from("ad_events").select("kind, placement, created_at")
        .eq("campaign_id", data.id).order("created_at", { ascending: false }).limit(200),
    ]);
    if (error) throw new Error(error.message);
    return { campaign: camp, creatives: creatives ?? [], recent_events: recent ?? [] };
  });

export const updateCampaignStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({
    id: z.string().uuid(),
    status: z.enum(["pending","active","paused","completed"]),
  }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("ad_campaigns")
      .update({ status: data.status })
      .eq("id", data.id).eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("ad_campaigns")
      .delete().eq("id", data.id).eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* =========================== ANALYTICS =========================== */

export const getCampaignAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: camp } = await context.supabase.from("ad_campaigns")
      .select("owner_id, impressions_count, clicks_count, engagements_count, spent_cents, budget_total_cents")
      .eq("id", data.id).maybeSingle();
    if (!camp || camp.owner_id !== context.userId) throw new Error("Not found");

    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: rows } = await context.supabase.from("ad_events")
      .select("kind, placement, created_at")
      .eq("campaign_id", data.id)
      .gte("created_at", since)
      .limit(5000);

    const byDay: Record<string, { impressions: number; clicks: number; engagements: number }> = {};
    const byPlacement: Record<string, { impressions: number; clicks: number }> = {};
    for (const r of rows ?? []) {
      const day = (r.created_at as string).slice(0, 10);
      const b = (byDay[day] ??= { impressions: 0, clicks: 0, engagements: 0 });
      if (r.kind === "impression") b.impressions++;
      if (r.kind === "click") b.clicks++;
      if (r.kind === "engagement") b.engagements++;
      const p = String(r.placement ?? "unknown");
      const bp = (byPlacement[p] ??= { impressions: 0, clicks: 0 });
      if (r.kind === "impression") bp.impressions++;
      if (r.kind === "click") bp.clicks++;
    }
    const ctr = camp.impressions_count > 0 ? camp.clicks_count / camp.impressions_count : 0;
    return {
      totals: {
        impressions: camp.impressions_count,
        clicks: camp.clicks_count,
        engagements: camp.engagements_count,
        spent_cents: camp.spent_cents,
        budget_total_cents: camp.budget_total_cents,
        ctr,
      },
      by_day: Object.entries(byDay).sort(([a],[b]) => a.localeCompare(b))
        .map(([day, v]) => ({ day, ...v })),
      by_placement: Object.entries(byPlacement).map(([placement, v]) => ({ placement, ...v })),
    };
  });

/* =========================== PUBLIC SPONSORED SLOTS =========================== */

export const listSponsoredCreatives = createServerFn({ method: "GET" })
  .validator((raw) => z.object({
    placement: PlacementEnum,
    limit: z.number().int().min(1).max(10).default(3),
  }).parse(raw))
  .handler(async ({ data }) => {
    const sb = publicClient();
    // Fetch active campaigns matching placement then join creatives.
    const { data: rows, error } = await sb.from("ad_creatives")
      .select("*, campaign:ad_campaigns!inner(id,status,placements,objective,name,owner_id,vendor_id)")
      .eq("is_active", true)
      .limit(data.limit * 3);
    if (error) return [];
    const filtered = (rows ?? []).filter((r: any) =>
      r.campaign?.status === "active" &&
      Array.isArray(r.campaign?.placements) &&
      r.campaign.placements.includes(data.placement),
    );
    // Shuffle & cap
    const shuffled = filtered.sort(() => Math.random() - 0.5).slice(0, data.limit);
    return shuffled;
  });

/* =========================== EVENT LOGGING =========================== */

export const logAdEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({
    campaign_id: z.string().uuid(),
    creative_id: z.string().uuid().optional(),
    kind: z.enum(["impression","click","engagement","conversion"]),
    placement: PlacementEnum.optional(),
  }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("ad_events").insert({
      campaign_id: data.campaign_id,
      creative_id: data.creative_id ?? null,
      kind: data.kind,
      user_id: context.userId,
      placement: (data.placement ?? null) as any,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
