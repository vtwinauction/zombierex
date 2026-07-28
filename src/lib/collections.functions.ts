/**
 * Saved collections — riders organize bookmarked posts into folders.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyCollections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("saved_collections")
      .select("id, name, sort_order, created_at, updated_at, items:saved_collection_items(count)")
      .eq("user_id", context.userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((c: any) => ({
      ...c,
      item_count: Array.isArray(c.items) ? c.items[0]?.count ?? 0 : 0,
    }));
  });

export const createCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z.object({
      name: z.string().trim().min(1).max(120),
      sort_order: z.number().int().default(0),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("saved_collections")
      .insert({ user_id: context.userId, name: data.name, sort_order: data.sort_order })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z.object({
      id: z.string().uuid(),
      name: z.string().trim().min(1).max(120).optional(),
      sort_order: z.number().int().optional(),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { id, ...updates } = data;
    const { data: row, error } = await context.supabase
      .from("saved_collections")
      .update(updates)
      .eq("id", id)
      .eq("user_id", context.userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("saved_collections")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addPostToCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z.object({ collection_id: z.string().uuid(), post_id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("saved_collection_items")
      .insert({ user_id: context.userId, ...data });
    if (error && !error.message.includes("duplicate key")) throw new Error(error.message);
    return { ok: true };
  });

export const removePostFromCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z.object({ collection_id: z.string().uuid(), post_id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("saved_collection_items")
      .delete()
      .eq("collection_id", data.collection_id)
      .eq("post_id", data.post_id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listSavedPostsInCollection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ collection_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: items, error: iErr } = await context.supabase
      .from("saved_collection_items")
      .select("post_id, created_at")
      .eq("collection_id", data.collection_id)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (iErr) throw new Error(iErr.message);
    const ids = Array.from(new Set((items ?? []).map((r: any) => r.post_id).filter(Boolean)));
    if (ids.length === 0) return [];
    const { data: posts, error: pErr } = await context.supabase
      .from("posts")
      .select("id, kind, caption, media_url, thumbnail_url, likes_count, comments_count, created_at, author:profiles!posts_author_id_fkey(id, display_name, handle, avatar_url)")
      .in("id", ids);
    if (pErr) throw new Error(pErr.message);
    const order = new Map(ids.map((id, i) => [id, i]));
    return (posts ?? []).sort(
      (a: any, b: any) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
    );
  });
