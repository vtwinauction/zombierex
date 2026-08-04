/**
 * Global search across profiles, posts, listings, clubs, events.
 * Uses pg_trgm indexes for autocomplete-quality ILIKE queries.
 * Public — safe columns only, RLS-friendly filters.
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

const SearchInput = z.object({
  q: z.string().trim().min(1).max(80),
  limit: z.number().int().min(1).max(20).default(8),
  kind: z.enum(["all", "riders", "posts", "crews", "parts", "events", "tags"]).default("all"),
});

export const searchAll = createServerFn({ method: "GET" })
  .validator((raw) => SearchInput.parse(raw))
  .handler(async ({ data }) => {
    const sb = serverPublic();
    const like = `%${data.q}%`;
    const kind = data.kind;
    const limit = data.limit;

    const runProfiles = () =>
      sb
        .from("profiles")
        .select("id, handle, display_name, avatar_url, tier")
        .or(`handle.ilike.${like},display_name.ilike.${like}`)
        .limit(limit);
    const runPosts = () =>
      sb
        .from("posts")
        .select("id, caption, thumbnail_url, media_url, kind")
        .ilike("caption", like)
        .limit(limit);
    const runListings = () =>
      sb
        .from("listings")
        .select("id, title, price_cents, currency, hero_image_url")
        .eq("status", "active")
        .ilike("title", like)
        .limit(limit);
    const runClubs = () =>
      sb.from("clubs").select("id, slug, name, banner_url").ilike("name", like).limit(limit);
    const runEvents = () =>
      sb
        .from("events")
        .select("id, title, starts_at, cover_url, location")
        .ilike("title", like)
        .limit(limit);
    const runHashtags = () =>
      sb
        .from("hashtags")
        .select("id, tag, usage_count")
        .ilike("tag", like)
        .order("usage_count", { ascending: false })
        .limit(limit);

    const needs = (k: typeof kind) => kind === "all" || kind === k;

    const [profiles, posts, listings, clubs, events, hashtags] = await Promise.all([
      needs("riders") ? runProfiles() : Promise.resolve({ data: [], error: null }),
      needs("posts") ? runPosts() : Promise.resolve({ data: [], error: null }),
      needs("parts") ? runListings() : Promise.resolve({ data: [], error: null }),
      needs("crews") ? runClubs() : Promise.resolve({ data: [], error: null }),
      needs("events") ? runEvents() : Promise.resolve({ data: [], error: null }),
      needs("tags") ? runHashtags() : Promise.resolve({ data: [], error: null }),
    ]);

    return {
      profiles: profiles.data ?? [],
      posts: posts.data ?? [],
      listings: listings.data ?? [],
      clubs: clubs.data ?? [],
      events: events.data ?? [],
      hashtags: hashtags.data ?? [],
    };
  });
