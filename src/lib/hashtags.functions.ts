/**
 * Hashtag pages — public read of posts tagged with a hashtag.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
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

const POST_COLS =
  "id, kind, caption, media_url, thumbnail_url, likes_count, comments_count, views_count, created_at";

export const getHashtagFeed = createServerFn({ method: "GET" })
  .validator((raw) =>
    z
      .object({
        tag: z.string().trim().min(1).max(60),
        limit: z.number().int().min(1).max(60).default(36),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const sb = serverPublic();
    const tag = data.tag.replace(/^#/, "").toLowerCase();

    const { data: tagRow } = await sb
      .from("hashtags")
      .select("id, tag, usage_count, created_at")
      .ilike("tag", tag)
      .maybeSingle();

    let posts: any[] = [];

    if (tagRow?.id) {
      const { data: links } = await sb
        .from("post_hashtags")
        .select("post_id")
        .eq("hashtag_id", tagRow.id)
        .limit(data.limit);
      const ids = (links ?? []).map((l: any) => l.post_id).filter(Boolean);
      if (ids.length) {
        const { data: rows } = await sb
          .from("posts")
          .select(POST_COLS)
          .in("id", ids)
          .is("deleted_at", null)
          .eq("is_hidden", false)
          .order("created_at", { ascending: false });
        posts = rows ?? [];
      }
    }

    // Fallback / supplement: caption scan for the raw token.
    if (posts.length < data.limit) {
      const { data: rows } = await sb
        .from("posts")
        .select(POST_COLS)
        .ilike("caption", `%#${tag}%`)
        .is("deleted_at", null)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(data.limit);
      const seen = new Set(posts.map((p) => p.id));
      for (const r of rows ?? []) if (!seen.has(r.id)) posts.push(r);
    }

    const related = await sb
      .from("hashtags")
      .select("tag, usage_count")
      .neq("tag", tag)
      .order("usage_count", { ascending: false })
      .limit(10);

    return {
      tag,
      usage_count: tagRow?.usage_count ?? posts.length,
      posts: posts.slice(0, data.limit),
      related: related.data ?? [],
    };
  });
