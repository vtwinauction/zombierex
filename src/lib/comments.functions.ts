/**
 * Post comments — server-side.
 * Reads use the public server client (respects `comments` RLS SELECT policies).
 * Writes/deletes require auth and enforce rate limiting via check_rate_limit.
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

export const listComments = createServerFn({ method: "GET" })
  .validator((raw) => z.object({
    post_id: z.string().uuid(),
    limit: z.number().int().min(1).max(200).default(100),
  }).parse(raw))
  .handler(async ({ data }) => {
    const sb = serverPublic();
    const { data: rows, error } = await sb
      .from("comments")
      .select("id, post_id, author_id, body, parent_id, created_at, author:profiles!comments_author_id_fkey(id, handle, display_name, avatar_url, is_verified)")
      .eq("post_id", data.post_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({
    post_id: z.string().uuid(),
    body: z.string().trim().min(1).max(2000),
    parent_id: z.string().uuid().nullable().optional(),
  }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error: rlErr } = await context.supabase.rpc("check_rate_limit", {
      _bucket: "comments", _max_hits: 30, _window_seconds: 3600,
    });
    if (rlErr) throw new Error(rlErr.message.includes("rate_limit_exceeded")
      ? "You're commenting too fast — try again in a bit."
      : rlErr.message);
    const { data: row, error } = await context.supabase
      .from("comments")
      .insert({
        post_id: data.post_id,
        author_id: context.userId,
        body: data.body,
        parent_id: data.parent_id ?? null,
      })
      .select("id, post_id, author_id, body, parent_id, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("comments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("author_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
