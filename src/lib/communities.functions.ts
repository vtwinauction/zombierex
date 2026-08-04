/**
 * Community (clubs) server functions — Phase 6.
 *
 * Public reads use publishable-key server client (RLS applies as anon,
 * so private clubs are automatically filtered). Mutations require auth
 * via `requireSupabaseAuth` and are further gated by RLS + is_club_staff.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

function serverPublic() {
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

export const CATEGORIES = [
  "custom_builds",
  "harley",
  "sport_bikes",
  "cafe_racers",
  "adventure_bikes",
  "cruisers",
  "choppers",
  "drag_racing",
  "drifting",
  "supercars",
  "hypercars",
  "jdm",
  "american_muscle",
  "european_performance",
  "classic_cars",
  "restorations",
  "off_road",
  "overlanding",
  "monster_trucks",
  "rally",
  "circuit_racing",
  "formula",
  "time_attack",
  "car_audio",
  "detailing",
  "ev_performance",
  "photography",
  "clubs",
  "local_riders",
  "local_meets",
] as const;

/* ============================================================
 * DISCOVER
 * ============================================================ */

export const discoverCommunities = createServerFn({ method: "GET" })
  .validator((raw) =>
    z
      .object({
        q: z.string().trim().max(80).optional(),
        category: z.string().max(40).optional(),
        location: z.string().max(80).optional(),
        sort: z.enum(["trending", "recent", "popular", "active"]).default("trending"),
        limit: z.number().int().min(1).max(50).default(24),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data }) => {
    const sb = serverPublic();
    let q = sb
      .from("clubs")
      .select(
        "id, slug, name, description, category, location, cover_url, banner_url, members_count, is_private, activity_score, created_at, hashtags",
      )
      .limit(data.limit);

    if (data.q) q = q.ilike("name", `%${data.q}%`);
    if (data.category) q = q.eq("category", data.category);
    if (data.location) q = q.ilike("location", `%${data.location}%`);

    switch (data.sort) {
      case "trending":
        q = q
          .order("activity_score", { ascending: false })
          .order("members_count", { ascending: false });
        break;
      case "popular":
        q = q.order("members_count", { ascending: false });
        break;
      case "recent":
        q = q.order("created_at", { ascending: false });
        break;
      case "active":
        q = q.order("activity_score", { ascending: false });
        break;
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getCommunityBySlug = createServerFn({ method: "GET" })
  .validator((raw) => z.object({ slug: z.string().min(1).max(80) }).parse(raw))
  .handler(async ({ data }) => {
    const sb = serverPublic();
    const { data: club, error } = await sb
      .from("clubs")
      .select(
        "id, slug, name, description, rules, category, location, cover_url, banner_url, members_count, is_private, join_policy, activity_score, created_at, hashtags, owner_id",
      )
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!club) return null;

    // Feed: pinned first, then recent
    const [pinnedRes, recentRes, eventsRes, staffRes] = await Promise.all([
      sb
        .from("posts")
        .select(
          "id, author_id, caption, media_url, thumbnail_url, kind, likes_count, comments_count, is_pinned, is_announcement, created_at",
        )
        .eq("club_id", club.id)
        .eq("is_pinned", true)
        .order("created_at", { ascending: false })
        .limit(3),
      sb
        .from("posts")
        .select(
          "id, author_id, caption, media_url, thumbnail_url, kind, likes_count, comments_count, is_pinned, is_announcement, created_at",
        )
        .eq("club_id", club.id)
        .eq("is_pinned", false)
        .order("created_at", { ascending: false })
        .limit(20),
      sb
        .from("events")
        .select("id, title, cover_url, starts_at, location, event_type, rsvp_count, guest_limit")
        .eq("club_id", club.id)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(6),
      sb
        .from("club_members")
        .select("user_id, role")
        .eq("club_id", club.id)
        .in("role", ["owner", "moderator"])
        .limit(20),
    ]);

    return {
      club,
      pinned: pinnedRes.data ?? [],
      posts: recentRes.data ?? [],
      events: eventsRes.data ?? [],
      staff: staffRes.data ?? [],
    };
  });

/* ============================================================
 * CREATE / EDIT
 * ============================================================ */

const CreateInput = z.object({
  name: z.string().trim().min(3).max(80),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "lowercase, digits and dashes only"),
  description: z.string().trim().max(2000).optional(),
  category: z.string().trim().min(2).max(40),
  location: z.string().trim().max(80).optional(),
  rules: z.string().trim().max(4000).optional(),
  cover_url: z.string().url().max(2048).optional(),
  banner_url: z.string().url().max(2048).optional(),
  is_private: z.boolean().default(false),
  join_policy: z.enum(["open", "request", "invite"]).default("open"),
  hashtags: z.array(z.string().trim().max(40)).max(20).default([]),
});

export const createCommunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => CreateInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { data: club, error } = await context.supabase
      .from("clubs")
      .insert({
        ...data,
        owner_id: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    // Add owner as member with role 'owner'
    await context.supabase
      .from("club_members")
      .insert({ club_id: club.id, user_id: context.userId, role: "owner" });
    return club;
  });

export const updateCommunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        id: z.string().uuid(),
        patch: CreateInput.partial().omit({ slug: true }),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("clubs")
      .update(data.patch)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/* ============================================================
 * MEMBERSHIP
 * ============================================================ */

export const joinCommunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        club_id: z.string().uuid(),
        message: z.string().trim().max(500).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: club, error: ce } = await context.supabase
      .from("clubs")
      .select("id, join_policy, is_private")
      .eq("id", data.club_id)
      .single();
    if (ce || !club) throw new Error("Community not found");

    if (club.join_policy === "open" && !club.is_private) {
      const { error } = await context.supabase
        .from("club_members")
        .insert({ club_id: club.id, user_id: context.userId, role: "member" });
      if (error && !error.message.includes("duplicate")) throw new Error(error.message);
      return { status: "joined" as const };
    }
    // Request-based flow
    const { error } = await context.supabase.from("club_join_requests").insert({
      club_id: club.id,
      user_id: context.userId,
      message: data.message ?? null,
    });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { status: "requested" as const };
  });

export const leaveCommunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ club_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("club_members")
      .delete()
      .eq("club_id", data.club_id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const decideRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        request_id: z.string().uuid(),
        approve: z.boolean(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: req, error: re } = await context.supabase
      .from("club_join_requests")
      .select("id, club_id, user_id, status")
      .eq("id", data.request_id)
      .single();
    if (re || !req) throw new Error("Request not found");
    if (req.status !== "pending") return { ok: true };

    if (data.approve) {
      const { error: me } = await context.supabase
        .from("club_members")
        .insert({ club_id: req.club_id, user_id: req.user_id, role: "member" });
      if (me && !me.message.includes("duplicate")) throw new Error(me.message);
    }
    const { error } = await context.supabase
      .from("club_join_requests")
      .update({
        status: data.approve ? "approved" : "rejected",
        decided_at: new Date().toISOString(),
        decided_by: context.userId,
      })
      .eq("id", req.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        club_id: z.string().uuid(),
        user_id: z.string().uuid(),
        role: z.enum(["moderator", "member"]),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("club_members")
      .update({ role: data.role })
      .eq("club_id", data.club_id)
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        club_id: z.string().uuid(),
        user_id: z.string().uuid(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("club_members")
      .delete()
      .eq("club_id", data.club_id)
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================================================
 * MODERATION
 * ============================================================ */

export const pinPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        post_id: z.string().uuid(),
        pinned: z.boolean(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("posts")
      .update({ is_pinned: data.pinned })
      .eq("id", data.post_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCommunityPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ post_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("posts")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.post_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================================================
 * EVENTS (community-scoped)
 * ============================================================ */

export const createCommunityEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        club_id: z.string().uuid().optional(),
        title: z.string().trim().min(3).max(120),
        description: z.string().trim().max(4000).optional(),
        starts_at: z.string().datetime(),
        ends_at: z.string().datetime().optional(),
        location: z.string().trim().max(200).optional(),
        cover_url: z.string().url().max(2048).optional(),
        event_type: z
          .enum([
            "drag",
            "drift",
            "ride",
            "meet",
            "bike_night",
            "track_day",
            "off_road",
            "monster_truck",
            "rally",
            "show",
            "cars_coffee",
          ])
          .default("meet"),
        guest_limit: z.number().int().positive().max(100000).optional(),
        gps_lat: z.number().min(-90).max(90).optional(),
        gps_lng: z.number().min(-180).max(180).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("events")
      .insert({ ...data, host_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const rsvpEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        event_id: z.string().uuid(),
        status: z.enum(["going", "interested", "cant"]).default("going"),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("event_rsvps")
      .upsert({ event_id: data.event_id, user_id: context.userId, status: data.status })
      .select();
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================================================
 * COMMUNITY POSTS (composer)
 * ============================================================ */

export const createCommunityPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        club_id: z.string().uuid(),
        caption: z.string().trim().max(2200).optional(),
        media_url: z.string().url().max(2048).optional(),
        thumbnail_url: z.string().url().max(2048).optional(),
        kind: z.enum(["photo", "video"]).default("photo"),
        is_announcement: z.boolean().default(false),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("posts")
      .insert({
        author_id: context.userId,
        club_id: data.club_id,
        caption: data.caption ?? null,
        media_url: data.media_url ?? null,
        thumbnail_url: data.thumbnail_url ?? null,
        kind: data.kind,
        is_announcement: data.is_announcement,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/* ============================================================
 * BADGES
 * ============================================================ */

export const listCommunityBadges = createServerFn({ method: "GET" })
  .validator((raw) => z.object({ club_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const sb = serverPublic();
    const { data: rows, error } = await sb
      .from("club_badges")
      .select("id, user_id, code, label, awarded_at")
      .eq("club_id", data.club_id)
      .order("awarded_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const awardBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        club_id: z.string().uuid(),
        user_id: z.string().uuid(),
        code: z.string().trim().min(2).max(40),
        label: z.string().trim().min(2).max(40),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("club_badges").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================================================
 * WEEKLY CHALLENGES
 * ============================================================ */

export const listChallenges = createServerFn({ method: "GET" })
  .validator((raw) =>
    z
      .object({
        club_id: z.string().uuid(),
        active_only: z.boolean().default(true),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const sb = serverPublic();
    let q = sb
      .from("weekly_challenges")
      .select(
        "id, title, description, hashtag, prize, cover_url, starts_at, ends_at, entries_count, is_active",
      )
      .eq("club_id", data.club_id)
      .order("ends_at", { ascending: false })
      .limit(20);
    if (data.active_only) q = q.eq("is_active", true).gte("ends_at", new Date().toISOString());
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        club_id: z.string().uuid(),
        title: z.string().trim().min(3).max(120),
        description: z.string().trim().max(2000).optional(),
        hashtag: z.string().trim().max(40).optional(),
        prize: z.string().trim().max(200).optional(),
        cover_url: z.string().url().max(2048).optional(),
        starts_at: z.string().datetime().optional(),
        ends_at: z.string().datetime(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("weekly_challenges")
      .insert({
        ...data,
        created_by: context.userId,
        starts_at: data.starts_at ?? new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const submitChallengeEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        challenge_id: z.string().uuid(),
        post_id: z.string().uuid(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("challenge_entries")
      .insert({ ...data, user_id: context.userId });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

export const challengeLeaderboard = createServerFn({ method: "GET" })
  .validator((raw) => z.object({ challenge_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const sb = serverPublic();
    const { data: entries, error } = await sb
      .from("challenge_entries")
      .select("id, user_id, post_id, votes_count, created_at")
      .eq("challenge_id", data.challenge_id)
      .order("votes_count", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(50);
    if (error) throw new Error(error.message);
    const rows = entries ?? [];
    if (rows.length === 0) return [];
    const postIds = rows.map((e) => e.post_id);
    const { data: posts } = await sb
      .from("posts")
      .select("id, caption, media_url, thumbnail_url, kind, author_id")
      .in("id", postIds);
    const byId = new Map((posts ?? []).map((p) => [p.id, p]));
    return rows.map((e) => ({ ...e, post: byId.get(e.post_id) ?? null }));
  });

export const toggleChallengeVote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ entry_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("challenge_entry_votes")
      .select("id")
      .eq("entry_id", data.entry_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing) {
      const { error } = await context.supabase
        .from("challenge_entry_votes")
        .delete()
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { voted: false as const };
    }
    const { error } = await context.supabase
      .from("challenge_entry_votes")
      .insert({ entry_id: data.entry_id, user_id: context.userId });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { voted: true as const };
  });

export const getChallenge = createServerFn({ method: "GET" })
  .validator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const sb = serverPublic();
    const { data: row, error } = await sb
      .from("weekly_challenges")
      .select(
        "id, club_id, title, description, hashtag, prize, cover_url, starts_at, ends_at, entries_count, is_active",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const myChallengeVotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ entry_ids: z.array(z.string().uuid()).max(100) }).parse(raw))
  .handler(async ({ data, context }) => {
    if (data.entry_ids.length === 0) return [] as string[];
    const { data: rows } = await context.supabase
      .from("challenge_entry_votes")
      .select("entry_id")
      .eq("user_id", context.userId)
      .in("entry_id", data.entry_ids);
    return (rows ?? []).map((r) => r.entry_id);
  });
