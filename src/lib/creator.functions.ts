/**
 * Creator Economy — Phase 8.
 * Server functions for creator profiles, tiers, subscriptions, tips,
 * drafts, scheduled posts, and collaboration inbox.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const CREATOR_CATEGORIES = [
  "motorcycle_builder",
  "custom_bike_builder",
  "car_builder",
  "racer",
  "drifter",
  "drag_racer",
  "detailer",
  "photographer",
  "videographer",
  "mechanic",
  "reviewer",
  "club",
  "event_organizer",
  "influencer",
  "other",
] as const;

const SocialLinks = z
  .object({
    instagram: z.string().max(200).optional().nullable(),
    youtube: z.string().max(200).optional().nullable(),
    tiktok: z.string().max(200).optional().nullable(),
    twitter: z.string().max(200).optional().nullable(),
    website: z.string().max(200).optional().nullable(),
  })
  .partial();

const ApplySchema = z.object({
  category: z.enum(CREATOR_CATEGORIES),
  tagline: z.string().trim().max(200).optional(),
  portfolio_url: z.string().url().max(500).optional().or(z.literal("")),
  collab_email: z.string().email().max(255).optional().or(z.literal("")),
  accepts_collabs: z.boolean().default(true),
  social_links: SocialLinks.optional(),
});

export const applyAsCreator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => ApplySchema.parse(raw))
  .handler(async ({ data, context }) => {
    const payload = {
      user_id: context.userId,
      category: data.category,
      tagline: data.tagline ?? null,
      portfolio_url: data.portfolio_url || null,
      collab_email: data.collab_email || null,
      accepts_collabs: data.accepts_collabs,
      social_links: data.social_links ?? {},
      status: "pending",
    };
    const { data: row, error } = await context.supabase
      .from("creator_profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select("id, user_id, status, category")

      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getMyCreatorProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("get_my_creator_profile");
    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    return row ?? null;
  });

export const updateMyCreatorProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    ApplySchema.partial()
      .extend({
        featured_post_ids: z.array(z.string().uuid()).max(6).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const patch: any = { ...data };
    if (patch.portfolio_url === "") patch.portfolio_url = null;
    if (patch.collab_email === "") patch.collab_email = null;
    const { data: row, error } = await context.supabase
      .from("creator_profiles")
      .update(patch)
      .eq("user_id", context.userId)
      .select(
        "id, user_id, category, tagline, portfolio_url, featured_post_ids, social_links, accepts_collabs, status, is_verified, is_featured, subscribers_count, tips_total_cents, approved_at, created_at, updated_at",
      )

      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getCreatorProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ user_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: cp, error } = await context.supabase
      .from("creator_profiles")
      .select(
        "id, user_id, category, tagline, accepts_collabs, is_verified, is_featured, status, subscribers_count, tips_total_cents, social_links, portfolio_url, featured_post_ids, created_at, updated_at, approved_at",
      )
      .eq("user_id", data.user_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!cp) return null;

    const [{ data: profile }, { data: tiers }, { data: sub }] = await Promise.all([
      context.supabase
        .from("profiles")
        .select(
          "id, handle, display_name, avatar_url, tier, is_verified, followers_count, following_count, posts_count, bio, location",
        )
        .eq("id", data.user_id)
        .maybeSingle(),
      context.supabase
        .from("creator_tiers")
        .select("*")
        .eq("creator_id", cp.id)
        .eq("is_active", true)
        .order("sort_order"),
      context.supabase
        .from("creator_subscriptions")
        .select("id, status, tier_id, current_period_end")
        .eq("creator_id", cp.id)
        .eq("subscriber_id", context.userId)
        .maybeSingle(),
    ]);

    return { ...cp, profile, tiers: tiers ?? [], my_subscription: sub ?? null };
  });

export const listCreators = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        scope: z
          .enum(["trending", "rising", "featured", "recommended", "local", "top"])
          .default("trending"),
        category: z.enum(CREATOR_CATEGORIES).optional(),
        search: z.string().trim().max(120).optional(),
        limit: z.number().int().min(1).max(50).default(24),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("creator_profiles")
      .select(
        "id, user_id, category, tagline, is_verified, is_featured, subscribers_count, tips_total_cents, created_at",
      )
      .eq("status", "approved")
      .limit(data.limit);

    if (data.scope === "featured") q = q.eq("is_featured", true);
    if (data.scope === "trending" || data.scope === "top")
      q = q.order("subscribers_count", { ascending: false });
    if (data.scope === "rising") q = q.order("created_at", { ascending: false });
    if (data.scope === "recommended") q = q.order("tips_total_cents", { ascending: false });
    if (data.scope === "local") q = q.order("subscribers_count", { ascending: false });
    if (data.category) q = q.eq("category", data.category);
    if (data.search) q = q.ilike("tagline", `%${data.search}%`);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const ids = (rows ?? []).map((r) => r.user_id);
    if (!ids.length) return [];
    const { data: profiles } = await context.supabase
      .from("profiles")
      .select("id, handle, display_name, avatar_url, tier, followers_count, location")
      .in("id", ids);
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    return (rows ?? []).map((r) => ({ ...r, profiles: byId.get(r.user_id) ?? null }));
  });

/* ============ TIERS ============ */
const TierInput = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional().nullable(),
  price_cents: z.number().int().min(0).max(1_000_000),
  currency: z.string().length(3).default("USD"),
  benefits: z.array(z.string().max(200)).max(20).default([]),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

async function getMyCreatorId(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("creator_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Not a creator");
  return data.id as string;
}

export const listMyTiers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const cid = await getMyCreatorId(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("creator_tiers")
      .select("*")
      .eq("creator_id", cid)
      .order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertTier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => TierInput.extend({ id: z.string().uuid().optional() }).parse(raw))
  .handler(async ({ data, context }) => {
    const cid = await getMyCreatorId(context.supabase, context.userId);
    const row = { creator_id: cid, ...data };
    const q = data.id
      ? context.supabase
          .from("creator_tiers")
          .update(row)
          .eq("id", data.id)
          .eq("creator_id", cid)
          .select()
          .single()
      : context.supabase.from("creator_tiers").insert(row).select().single();
    const { data: r, error } = await q;
    if (error) throw new Error(error.message);
    return r;
  });

export const deleteTier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const cid = await getMyCreatorId(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("creator_tiers")
      .delete()
      .eq("id", data.id)
      .eq("creator_id", cid);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============ SUBSCRIPTIONS ============ */
export const subscribeToCreator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({ creator_id: z.string().uuid(), tier_id: z.string().uuid().nullable().optional() })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const period_end = new Date();
    period_end.setMonth(period_end.getMonth() + 1);
    const { data: row, error } = await context.supabase
      .from("creator_subscriptions")
      .upsert(
        {
          creator_id: data.creator_id,
          subscriber_id: context.userId,
          tier_id: data.tier_id ?? null,
          status: "active",
          current_period_end: period_end.toISOString(),
          cancelled_at: null,
        },
        { onConflict: "creator_id,subscriber_id" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ creator_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("creator_subscriptions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("creator_id", data.creator_id)
      .eq("subscriber_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============ TIPS ============ */
export const tipCreator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        creator_id: z.string().uuid(),
        amount_cents: z.number().int().min(100).max(1_000_000),
        message: z.string().max(500).optional(),
        context: z.enum(["profile", "post", "live"]).default("profile"),
        post_id: z.string().uuid().optional().nullable(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("creator_tips")
      .insert({
        creator_id: data.creator_id,
        supporter_id: context.userId,
        amount_cents: data.amount_cents,
        message: data.message ?? null,
        context: data.context,
        post_id: data.post_id ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/* ============ ANALYTICS / DASHBOARD ============ */
export const getCreatorDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: cp } = await context.supabase
      .from("creator_profiles")
      .select(
        "id, user_id, category, tagline, portfolio_url, featured_post_ids, social_links, accepts_collabs, status, is_verified, is_featured, subscribers_count, tips_total_cents, approved_at, created_at, updated_at",
      )

      .eq("user_id", context.userId)
      .maybeSingle();
    if (!cp) return null;

    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceIso = since.toISOString();

    const [
      { data: recentPosts },
      { count: newSubs },
      { count: newTips },
      { data: tipsSum },
      { count: newCollabs },
      { data: topPosts },
    ] = await Promise.all([
      context.supabase
        .from("posts")
        .select("id, created_at, likes_count, comments_count, shares_count, views_count")
        .eq("author_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(50),
      context.supabase
        .from("creator_subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", cp.id)
        .eq("status", "active")
        .gte("created_at", sinceIso),
      context.supabase
        .from("creator_tips")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", cp.id)
        .gte("created_at", sinceIso),
      context.supabase
        .from("creator_tips")
        .select("amount_cents")
        .eq("creator_id", cp.id)
        .gte("created_at", sinceIso),
      context.supabase
        .from("collab_requests")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", cp.id)
        .eq("status", "new"),
      context.supabase
        .from("posts")
        .select(
          "id, kind, caption, thumbnail_url, media_url, likes_count, comments_count, views_count, created_at",
        )
        .eq("author_id", context.userId)
        .order("likes_count", { ascending: false })
        .limit(5),
    ]);

    const totalViews = (recentPosts ?? []).reduce((s, p: any) => s + (p.views_count ?? 0), 0);
    const totalLikes = (recentPosts ?? []).reduce((s, p: any) => s + (p.likes_count ?? 0), 0);
    const totalComments = (recentPosts ?? []).reduce((s, p: any) => s + (p.comments_count ?? 0), 0);
    const totalShares = (recentPosts ?? []).reduce((s, p: any) => s + (p.shares_count ?? 0), 0);
    const engagementRate =
      totalViews > 0 ? (totalLikes + totalComments + totalShares) / totalViews : 0;
    const tipsThisPeriod = (tipsSum ?? []).reduce(
      (s: number, t: any) => s + (t.amount_cents ?? 0),
      0,
    );

    // Best posting time heuristic — hour-of-day with the highest average engagement
    const hourBuckets = Array.from({ length: 24 }, () => ({ n: 0, eng: 0 }));
    for (const p of (recentPosts ?? []) as any[]) {
      const h = new Date(p.created_at).getHours();
      hourBuckets[h].n += 1;
      hourBuckets[h].eng += (p.likes_count ?? 0) + (p.comments_count ?? 0) + (p.shares_count ?? 0);
    }
    const bestHour =
      hourBuckets
        .map((b, h) => ({ h, avg: b.n ? b.eng / b.n : 0 }))
        .sort((a, b) => b.avg - a.avg)[0]?.h ?? null;

    return {
      profile: cp,
      period_days: 30,
      new_subscribers: newSubs ?? 0,
      new_tips_count: newTips ?? 0,
      tips_cents_last_30d: tipsThisPeriod,
      collab_inbox_unread: newCollabs ?? 0,
      total_views: totalViews,
      total_likes: totalLikes,
      total_comments: totalComments,
      total_shares: totalShares,
      engagement_rate: engagementRate,
      best_hour_utc: bestHour,
      top_posts: topPosts ?? [],
      recent_post_count: (recentPosts ?? []).length,
    };
  });

/* ============ COLLAB INBOX ============ */
export const listMyCollabInbox = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        status: z
          .enum(["new", "read", "replied", "accepted", "declined", "archived", "all"])
          .default("all"),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    const cid = await getMyCreatorId(context.supabase, context.userId);
    let q = context.supabase
      .from("collab_requests")
      .select("*")
      .eq("creator_id", cid)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const sids = Array.from(new Set((rows ?? []).map((r) => r.sender_id)));
    const { data: senders } = sids.length
      ? await context.supabase
          .from("profiles")
          .select("id, handle, display_name, avatar_url")
          .in("id", sids)
      : { data: [] as any[] };
    const byId = new Map((senders ?? []).map((s) => [s.id, s]));
    return (rows ?? []).map((r) => ({ ...r, sender: byId.get(r.sender_id) ?? null }));
  });

export const sendCollabRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        creator_id: z.string().uuid(),
        brand_name: z.string().trim().min(1).max(120),
        brand_website: z.string().url().max(300).optional().or(z.literal("")),
        subject: z.string().trim().min(1).max(200),
        message: z.string().trim().min(1).max(4000),
        campaign_type: z
          .enum(["sponsorship", "product_seed", "ambassador", "ugc", "other"])
          .default("other"),
        budget_cents: z.number().int().min(0).max(100_000_000).optional(),
        currency: z.string().length(3).default("USD"),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("collab_requests")
      .insert({
        creator_id: data.creator_id,
        sender_id: context.userId,
        brand_name: data.brand_name,
        brand_website: data.brand_website || null,
        subject: data.subject,
        message: data.message,
        campaign_type: data.campaign_type,
        budget_cents: data.budget_cents ?? null,
        currency: data.currency,
        status: "new",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateCollabStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["new", "read", "replied", "accepted", "declined", "archived"]),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const cid = await getMyCreatorId(context.supabase, context.userId);
    const patch: any = { status: data.status };
    if (data.status === "read") patch.read_at = new Date().toISOString();
    if (["replied", "accepted", "declined"].includes(data.status))
      patch.responded_at = new Date().toISOString();
    const { error } = await context.supabase
      .from("collab_requests")
      .update(patch)
      .eq("id", data.id)
      .eq("creator_id", cid);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============ DRAFTS ============ */
const DraftInput = z.object({
  kind: z.enum(["photo", "video", "telemetry", "event"]).default("photo"),
  caption: z.string().max(4000).optional().nullable(),
  media_urls: z.array(z.string().url()).max(10).default([]),
  hashtags: z.array(z.string().max(80)).max(30).default([]),
  visibility: z.enum(["public", "followers", "subscribers", "club", "private"]).default("public"),
  club_id: z.string().uuid().optional().nullable(),
  is_subscribers_only: z.boolean().default(false),
});

export const listMyDrafts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("post_drafts")
      .select("*")
      .eq("author_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => DraftInput.extend({ id: z.string().uuid().optional() }).parse(raw))
  .handler(async ({ data, context }) => {
    const row = { author_id: context.userId, ...data };
    const q = data.id
      ? context.supabase
          .from("post_drafts")
          .update(row)
          .eq("id", data.id)
          .eq("author_id", context.userId)
          .select()
          .single()
      : context.supabase.from("post_drafts").insert(row).select().single();
    const { data: r, error } = await q;
    if (error) throw new Error(error.message);
    return r;
  });

export const deleteDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("post_drafts")
      .delete()
      .eq("id", data.id)
      .eq("author_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============ SCHEDULED POSTS ============ */
export const listMyScheduled = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("scheduled_posts")
      .select("*")
      .eq("author_id", context.userId)
      .order("publish_at", { ascending: true })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const schedulePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    DraftInput.extend({
      id: z.string().uuid().optional(),
      publish_at: z.string().datetime(),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const row = { author_id: context.userId, status: "scheduled" as const, ...data };
    const q = data.id
      ? context.supabase
          .from("scheduled_posts")
          .update(row)
          .eq("id", data.id)
          .eq("author_id", context.userId)
          .select()
          .single()
      : context.supabase.from("scheduled_posts").insert(row).select().single();
    const { data: r, error } = await q;
    if (error) throw new Error(error.message);
    return r;
  });

export const cancelScheduled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("scheduled_posts")
      .update({ status: "cancelled" })
      .eq("id", data.id)
      .eq("author_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- Creator payouts ledger --------
export const getMyPayoutsLedger = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: creator } = await context.supabase
      .from("creator_profiles")
      .select("id, subscribers_count, tips_total_cents, status")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!creator) {
      return { is_creator: false, tips: [], subscriptions: [], summary: null };
    }

    const [{ data: tips }, { data: subs }] = await Promise.all([
      context.supabase
        .from("creator_tips")
        .select("id, amount_cents, currency, message, created_at, supporter_id")
        .eq("creator_id", creator.id)
        .order("created_at", { ascending: false })
        .limit(50),
      context.supabase
        .from("creator_subscriptions")
        .select("id, status, current_period_end, created_at, subscriber_id, tier_id")
        .eq("creator_id", creator.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const supporterIds = Array.from(
      new Set([
        ...(tips ?? []).map((t) => t.supporter_id),
        ...(subs ?? []).map((s) => s.subscriber_id),
      ]),
    );
    let profiles: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
    if (supporterIds.length > 0) {
      const { data: rows } = await context.supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", supporterIds);
      for (const row of rows ?? []) {
        profiles[row.id] = { display_name: row.display_name, avatar_url: row.avatar_url };
      }
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const tipsMonth = (tips ?? [])
      .filter((t) => new Date(t.created_at) >= monthStart)
      .reduce((sum, t) => sum + (t.amount_cents ?? 0), 0);
    const activeSubs = (subs ?? []).filter((s) => s.status === "active").length;

    return {
      is_creator: true,
      summary: {
        lifetime_tips_cents: creator.tips_total_cents ?? 0,
        tips_this_month_cents: tipsMonth,
        subscribers: creator.subscribers_count ?? 0,
        active_subscriptions: activeSubs,
        status: creator.status,
      },
      tips: (tips ?? []).map((t) => ({ ...t, supporter: profiles[t.supporter_id] ?? null })),
      subscriptions: (subs ?? []).map((s) => ({
        ...s,
        subscriber: profiles[s.subscriber_id] ?? null,
      })),
    };
  });

/* ============ ANALYTICS DEEP-DIVE ============ */
export const getCreatorAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z.object({ days: z.number().int().min(7).max(365).default(30) }).parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: creator } = await context.supabase
      .from("creator_profiles")
      .select("id, user_id, subscribers_count, tips_total_cents, status, created_at")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!creator) return null;

    const since = new Date();
    since.setDate(since.getDate() - data.days);
    const sinceIso = since.toISOString();

    const [{ data: posts }, { data: subs }, { data: tips }, { count: allTimePostsCount }] =
      await Promise.all([
        context.supabase
          .from("posts")
          .select(
            "id, created_at, likes_count, comments_count, shares_count, views_count, kind, caption, thumbnail_url",
          )
          .eq("author_id", context.userId)
          .gte("created_at", sinceIso)
          .order("created_at", { ascending: true }),
        context.supabase
          .from("creator_subscriptions")
          .select("id, created_at, status, cancelled_at, tier_id")
          .eq("creator_id", creator.id)
          .gte("created_at", sinceIso)
          .order("created_at", { ascending: true }),
        context.supabase
          .from("creator_tips")
          .select("id, created_at, amount_cents, currency")
          .eq("creator_id", creator.id)
          .gte("created_at", sinceIso)
          .order("created_at", { ascending: true }),
        context.supabase
          .from("posts")
          .select("id, likes_count, comments_count, shares_count, views_count", {
            count: "exact",
            head: true,
          })
          .eq("author_id", context.userId),
      ]);

    const days: Record<
      string,
      {
        date: string;
        views: number;
        likes: number;
        comments: number;
        shares: number;
        posts: number;
        tips: number;
        subs: number;
        cancels: number;
      }
    > = {};
    const labels: string[] = [];
    for (let i = data.days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      labels.push(key);
      days[key] = {
        date: key,
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        posts: 0,
        tips: 0,
        subs: 0,
        cancels: 0,
      };
    }

    for (const p of (posts ?? []) as any[]) {
      const key = p.created_at.slice(0, 10);
      if (!days[key]) continue;
      days[key].posts += 1;
      days[key].views += p.views_count ?? 0;
      days[key].likes += p.likes_count ?? 0;
      days[key].comments += p.comments_count ?? 0;
      days[key].shares += p.shares_count ?? 0;
    }
    for (const s of (subs ?? []) as any[]) {
      const key = s.created_at.slice(0, 10);
      if (!days[key]) continue;
      days[key].subs += 1;
      if (s.status === "cancelled" && s.cancelled_at) {
        const ckey = s.cancelled_at.slice(0, 10);
        if (days[ckey]) days[ckey].cancels += 1;
      }
    }
    for (const t of (tips ?? []) as any[]) {
      const key = t.created_at.slice(0, 10);
      if (!days[key]) continue;
      days[key].tips += t.amount_cents ?? 0;
    }

    const daily = labels.map((k) => days[k]);
    const totals = daily.reduce(
      (a, b) => ({
        views: a.views + b.views,
        likes: a.likes + b.likes,
        comments: a.comments + b.comments,
        shares: a.shares + b.shares,
        posts: a.posts + b.posts,
        tips: a.tips + b.tips,
        subs: a.subs + b.subs,
        cancels: a.cancels + b.cancels,
      }),
      { views: 0, likes: 0, comments: 0, shares: 0, posts: 0, tips: 0, subs: 0, cancels: 0 },
    );

    const topPosts = (posts ?? [])
      .sort((a: any, b: any) => (b.views_count ?? 0) - (a.views_count ?? 0))
      .slice(0, 5)
      .map((p: any) => ({
        id: p.id,
        caption: p.caption,
        thumbnail_url: p.thumbnail_url,
        views: p.views_count ?? 0,
        likes: p.likes_count ?? 0,
        comments: p.comments_count ?? 0,
      }));

    return {
      profile: creator,
      period_days: data.days,
      daily,
      totals,
      top_posts: topPosts,
      all_time_posts: allTimePostsCount ?? 0,
    };
  });
