/**
 * Feed server functions.
 * - listFeed is public (uses publishable-key server client, RLS as anon)
 * - createPost/react/unreact require auth
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

export const listFeed = createServerFn({ method: "GET" })
  .validator((raw) =>
    z
      .object({
        limit: z.number().int().min(1).max(50).default(20),
        cursor: z.string().datetime().optional(),
        kind: z.enum(["photo", "video", "event", "telemetry"]).optional(),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data }) => {
    const supabase = serverPublic();
    let q = supabase
      .from("posts")
      .select(
        "id, author_id, kind, caption, media_url, thumbnail_url, likes_count, comments_count, shares_count, views_count, created_at, author:profiles!posts_author_id_fkey(id, display_name, handle, avatar_url, is_verified, location)",
      )
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.kind) q = q.eq("kind", data.kind);
    if (data.cursor) q = q.lt("created_at", data.cursor);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return {
      items: rows ?? [],
      nextCursor: rows && rows.length === data.limit ? rows[rows.length - 1].created_at : null,
    };
  });

/**
 * Authenticated feed variant that also filters out posts from blocked/muted
 * users and captions matching the viewer's keyword filters. Falls back
 * gracefully if any of those tables are empty.
 */
export const listAuthedFeed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        limit: z.number().int().min(1).max(50).default(20),
        cursor: z.string().datetime().optional(),
        kind: z.enum(["photo", "video", "event", "telemetry"]).optional(),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const [blocksRes, mutesRes, kwRes] = await Promise.all([
      sb.from("user_blocks").select("blocked_id").eq("blocker_id", context.userId),
      sb.from("user_mutes").select("muted_id").eq("muter_id", context.userId),
      sb.from("keyword_filters").select("keyword, match_type").eq("user_id", context.userId),
    ]);
    const excluded = new Set<string>();
    for (const r of blocksRes.data ?? []) if (r?.blocked_id) excluded.add(r.blocked_id);
    for (const r of mutesRes.data ?? []) if (r?.muted_id) excluded.add(r.muted_id);
    const keywords: { keyword: string; match_type: string | null }[] = kwRes.data ?? [];

    let q = sb
      .from("posts")
      .select(
        "id, author_id, kind, caption, media_url, thumbnail_url, likes_count, comments_count, shares_count, views_count, created_at, author:profiles!posts_author_id_fkey(id, display_name, handle, avatar_url, is_verified, location)",
      )
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(data.limit + excluded.size);
    if (data.kind) q = q.eq("kind", data.kind);
    if (data.cursor) q = q.lt("created_at", data.cursor);
    if (excluded.size > 0) q = q.not("author_id", "in", `(${Array.from(excluded).join(",")})`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const filtered = (rows ?? [])
      .filter((row: any) => {
        const caption = String(row.caption ?? "").toLowerCase();
        return !keywords.some((k) => {
          const kw = k.keyword.toLowerCase();
          return k.match_type === "exact"
            ? caption.split(/\W+/).includes(kw)
            : caption.includes(kw);
        });
      })
      .slice(0, data.limit);
    return {
      items: filtered,

      nextCursor:
        filtered.length === data.limit ? (filtered[filtered.length - 1] as any).created_at : null,
    };
  });

export const getPostPublic = createServerFn({ method: "GET" })
  .validator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const supabase = serverPublic();
    const { data: row, error } = await supabase
      .from("posts")
      .select(
        "id, author_id, kind, caption, media_url, thumbnail_url, likes_count, comments_count, shares_count, views_count, created_at, author:profiles!posts_author_id_fkey(id, display_name, handle, avatar_url, is_verified, location, bio)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const getProfileByHandlePublic = createServerFn({ method: "GET" })
  .validator((raw) => z.object({ handle: z.string().trim().min(1).max(32) }).parse(raw))
  .handler(async ({ data }) => {
    const supabase = serverPublic();
    const handle = data.handle.replace(/^@/, "");
    const { data: profile, error } = await supabase
      .from("profiles")
      .select(
        "id, handle, display_name, bio, avatar_url, cover_url, tier, is_verified, followers_count, following_count, posts_count, location, website, is_business, is_private, allow_messages",
      )
      .eq("handle", handle)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!profile) return null;
    // Privacy enforcement: unauthenticated / public callers only see posts
    // for non-private accounts. Private profiles surface identity + counts
    // but hide their post grid; a signed-in caller can fetch full data via
    // an authenticated endpoint after follow status is established.
    if ((profile as any).is_private) {
      return { profile, posts: [], restricted: true as const };
    }
    const { data: posts } = await supabase
      .from("posts")
      .select("id, kind, caption, media_url, thumbnail_url, created_at")
      .eq("author_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(36);
    return { profile, posts: posts ?? [], restricted: false as const };
  });

export const createPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        kind: z.enum(["video", "photo", "telemetry", "event"]).default("photo"),
        caption: z.string().trim().max(2200).optional(),
        media_url: z.string().url().max(2048).optional(),
        thumbnail_url: z.string().url().max(2048).optional(),
        vehicle_id: z.string().uuid().optional(),
        is_reel: z.boolean().default(false),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { assertModuleEnabled } = await import("./feature-gate.server");
    await assertModuleEnabled("posting", "Posting");
    const { error: rlErr } = await context.supabase.rpc("check_rate_limit", {
      _bucket: "posts",
      _max_hits: 10,
      _window_seconds: 3600,
    });
    if (rlErr)
      throw new Error(
        rlErr.message.includes("rate_limit_exceeded")
          ? "You're posting too fast — take a breather and try again in a bit."
          : rlErr.message,
      );
    // Server-side moderation — client checks are advisory only. Fail-open on
    // gateway errors (skipped=true), fail-closed on explicit unsafe verdicts.
    if (data.caption && data.caption.trim().length >= 3) {
      const { moderateText } = await import("./moderation-text.server");
      const verdict = await moderateText(data.caption);
      if (!verdict.safe && !verdict.skipped) {
        throw new Error(
          `Caption blocked by safety filter${verdict.reason ? `: ${verdict.reason}` : "."}`,
        );
      }
    }
    // Only classify still images. Video frames need a dedicated pipeline; a
    // video URL sent to the image classifier confuses the model and can
    // wrongly block a legitimate upload. Prefer the thumbnail when present.
    const imageUrl =
      data.kind === "photo"
        ? data.media_url
        : data.kind === "video"
          ? data.thumbnail_url
          : undefined;
    if (imageUrl) {
      const { moderateImageUrl } = await import("./moderation-image.server");
      const verdict = await moderateImageUrl(imageUrl);
      if (!verdict.safe && !verdict.skipped) {
        throw new Error(
          `Image blocked by safety filter${verdict.reason ? `: ${verdict.reason}` : "."}`,
        );
      }
    }
    const { data: row, error } = await context.supabase
      .from("posts")
      .insert({ ...data, author_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listMyPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("posts")
      .select(
        "id, kind, caption, media_url, thumbnail_url, likes_count, comments_count, created_at",
      )
      .eq("author_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listMySavedPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const { data: saves, error: sErr } = await sb
      .from("reactions")
      .select("post_id, created_at")
      .eq("user_id", context.userId)
      .eq("kind", "save")
      .order("created_at", { ascending: false })
      .limit(200);
    if (sErr) throw new Error(sErr.message);
    const ids = Array.from(new Set((saves ?? []).map((r: any) => r.post_id).filter(Boolean)));
    if (ids.length === 0) return [];
    const { data: posts, error: pErr } = await sb
      .from("posts")
      .select(
        "id, kind, caption, media_url, thumbnail_url, likes_count, comments_count, created_at, author:profiles!posts_author_id_fkey(id, display_name, handle, avatar_url)",
      )
      .in("id", ids);
    if (pErr) throw new Error(pErr.message);
    const order = new Map(ids.map((id, i) => [id, i]));
    return (posts ?? []).sort((a: any, b: any) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  });

export const getMyPost = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("posts")
      .select("id, kind, caption, media_url, thumbnail_url, vehicle_id, is_reel, author_id")
      .eq("id", data.id)
      .eq("author_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ?? null;
  });

export const updatePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        id: z.string().uuid(),
        caption: z.string().trim().max(2200).optional(),
        media_url: z.string().url().max(2048).optional().or(z.literal("")),
        thumbnail_url: z.string().url().max(2048).optional().or(z.literal("")),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const payload: Record<string, string | null> = {};
    if (rest.caption !== undefined) payload.caption = rest.caption;
    if (rest.media_url !== undefined)
      payload.media_url = rest.media_url === "" ? null : rest.media_url;
    if (rest.thumbnail_url !== undefined)
      payload.thumbnail_url = rest.thumbnail_url === "" ? null : rest.thumbnail_url;
    const { data: row, error } = await context.supabase
      .from("posts")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(payload as any)
      .eq("id", id)
      .eq("author_id", context.userId)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return row;
  });

export const deletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("posts")
      .delete()
      .eq("id", data.id)
      .eq("author_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const react = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        post_id: z.string().uuid(),
        kind: z.enum(["like", "save", "share"]),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("reactions")
      .insert({ post_id: data.post_id, user_id: context.userId, kind: data.kind });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

export const unreact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        post_id: z.string().uuid(),
        kind: z.enum(["like", "save", "share"]),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("reactions")
      .delete()
      .eq("post_id", data.post_id)
      .eq("user_id", context.userId)
      .eq("kind", data.kind);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const follow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ followee_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    if (data.followee_id === context.userId) throw new Error("Cannot follow yourself");
    const { error: rlErr } = await context.supabase.rpc("check_rate_limit", {
      _bucket: "follows",
      _max_hits: 60,
      _window_seconds: 3600,
    });
    if (rlErr)
      throw new Error(
        rlErr.message.includes("rate_limit_exceeded")
          ? "Slow down on the follows — try again in a bit."
          : rlErr.message,
      );
    const { error } = await context.supabase
      .from("follows")
      .insert({ follower_id: context.userId, followee_id: data.followee_id });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

export const unfollow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ followee_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("follows")
      .delete()
      .eq("follower_id", context.userId)
      .eq("followee_id", data.followee_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
