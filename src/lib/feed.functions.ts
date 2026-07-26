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
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const listFeed = createServerFn({ method: "GET" })
  .inputValidator((raw) =>
    z.object({
      limit: z.number().int().min(1).max(50).default(20),
      cursor: z.string().datetime().optional(),
    }).parse(raw ?? {}),
  )
  .handler(async ({ data }) => {
    const supabase = serverPublic();
    let q = supabase
      .from("posts")
      .select("id, author_id, kind, caption, media_url, thumbnail_url, likes_count, comments_count, shares_count, views_count, created_at, author:profiles!posts_author_id_fkey(id, display_name, handle, avatar_url, is_verified, location)")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.cursor) q = q.lt("created_at", data.cursor);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [], nextCursor: rows && rows.length === data.limit ? rows[rows.length - 1].created_at : null };
  });


export const createPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z.object({
      kind: z.enum(["video", "photo", "telemetry", "event"]).default("photo"),
      caption: z.string().trim().max(2200).optional(),
      media_url: z.string().url().max(2048).optional(),
      thumbnail_url: z.string().url().max(2048).optional(),
      vehicle_id: z.string().uuid().optional(),
      is_reel: z.boolean().default(false),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error: rlErr } = await context.supabase.rpc("check_rate_limit", {
      _bucket: "posts", _max_hits: 10, _window_seconds: 3600,
    });
    if (rlErr) throw new Error(rlErr.message.includes("rate_limit_exceeded")
      ? "You're posting too fast — take a breather and try again in a bit."
      : rlErr.message);
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
      .select("id, kind, caption, media_url, thumbnail_url, likes_count, comments_count, created_at")
      .eq("author_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMyPost = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
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
  .inputValidator((raw) =>
    z.object({
      id: z.string().uuid(),
      caption: z.string().trim().max(2200).optional(),
      media_url: z.string().url().max(2048).optional().or(z.literal("")),
      thumbnail_url: z.string().url().max(2048).optional().or(z.literal("")),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const payload: Record<string, string | null> = {};
    if (rest.caption !== undefined) payload.caption = rest.caption;
    if (rest.media_url !== undefined) payload.media_url = rest.media_url === "" ? null : rest.media_url;
    if (rest.thumbnail_url !== undefined) payload.thumbnail_url = rest.thumbnail_url === "" ? null : rest.thumbnail_url;
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
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
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
  .inputValidator((raw) =>
    z.object({
      post_id: z.string().uuid(),
      kind: z.enum(["like", "save", "share"]),
    }).parse(raw),
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
  .inputValidator((raw) =>
    z.object({
      post_id: z.string().uuid(),
      kind: z.enum(["like", "save", "share"]),
    }).parse(raw),
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
  .inputValidator((raw) => z.object({ followee_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    if (data.followee_id === context.userId) throw new Error("Cannot follow yourself");
    const { error: rlErr } = await context.supabase.rpc("check_rate_limit", {
      _bucket: "follows", _max_hits: 60, _window_seconds: 3600,
    });
    if (rlErr) throw new Error(rlErr.message.includes("rate_limit_exceeded")
      ? "Slow down on the follows — try again in a bit."
      : rlErr.message);
    const { error } = await context.supabase
      .from("follows")
      .insert({ follower_id: context.userId, followee_id: data.followee_id });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

export const unfollow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ followee_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("follows")
      .delete()
      .eq("follower_id", context.userId)
      .eq("followee_id", data.followee_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
