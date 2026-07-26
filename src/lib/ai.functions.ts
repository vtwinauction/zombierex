/**
 * ZOMBIEREX Phase 11 — AI & Smart Features server functions.
 *
 * All calls go through the Lovable AI Gateway (server-side).
 * Public where personalization isn't required; authenticated for
 * user-specific recommendations and moderation actions.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { aiComplete, aiCompleteJson, type ChatMessage } from "@/lib/ai-gateway.server";

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

const SYSTEM_BRAND =
  "You are REX, the in-app AI companion for ZOMBIEREX — an exclusive social platform for motorcycle and automotive enthusiasts. You are concise, knowledgeable about bikes/cars/motorsport, and speak with quiet confidence. You never invent app features that don't exist.";

/* ─────────────────────────────  CONTENT ASSIST  ───────────────────────────── */

export const suggestCaption = createServerFn({ method: "POST" })
  .inputValidator((raw) =>
    z.object({
      context: z.string().trim().max(600).optional(),
      vibe: z.enum(["technical", "hype", "cinematic", "casual", "poetic"]).optional(),
      kind: z.enum(["image", "video", "reel", "story", "listing", "event"]).optional(),
    }).parse(raw),
  )
  .handler(async ({ data }) => {
    const prompt = [
      `Vibe: ${data.vibe ?? "cinematic"}. Format: ${data.kind ?? "image"}.`,
      data.context ? `Context: ${data.context}` : "Context: (a motorcycle or automotive post)",
      `Return JSON: {"captions": string[3]}. Each caption 60-180 chars, no emojis unless the vibe is 'hype', no hashtags.`,
    ].join("\n");
    const out = await aiCompleteJson<{ captions?: string[] }>([
      { role: "system", content: SYSTEM_BRAND },
      { role: "user", content: prompt },
    ], { temperature: 0.9 });
    return { captions: (out.captions ?? []).slice(0, 3) };
  });

export const suggestHashtags = createServerFn({ method: "POST" })
  .inputValidator((raw) => z.object({ context: z.string().trim().min(1).max(600) }).parse(raw))
  .handler(async ({ data }) => {
    const out = await aiCompleteJson<{ hashtags?: string[] }>([
      { role: "system", content: SYSTEM_BRAND },
      {
        role: "user",
        content:
          `Suggest 8 relevant hashtags for this motorcycle/automotive post. ` +
          `Mix broad + niche. No spaces. Return JSON {"hashtags": string[]} where each starts with '#'. ` +
          `Post: ${data.context}`,
      },
    ], { temperature: 0.6 });
    return { hashtags: (out.hashtags ?? []).slice(0, 12) };
  });

export const suggestTitle = createServerFn({ method: "POST" })
  .inputValidator((raw) => z.object({ context: z.string().trim().min(1).max(1000) }).parse(raw))
  .handler(async ({ data }) => {
    const out = await aiCompleteJson<{ titles?: string[] }>([
      { role: "system", content: SYSTEM_BRAND },
      {
        role: "user",
        content: `Give 3 concise, evocative titles (max 60 chars) for this listing/event. JSON: {"titles": string[3]}. Context: ${data.context}`,
      },
    ], { temperature: 0.8 });
    return { titles: (out.titles ?? []).slice(0, 3) };
  });

export const improveText = createServerFn({ method: "POST" })
  .inputValidator((raw) =>
    z.object({
      text: z.string().trim().min(1).max(4000),
      mode: z.enum(["grammar", "shorten", "expand", "polish"]).default("polish"),
    }).parse(raw),
  )
  .handler(async ({ data }) => {
    const instr: Record<string, string> = {
      grammar: "Fix grammar and typos only. Preserve tone and length.",
      shorten: "Rewrite tighter and shorter, preserve meaning.",
      expand: "Expand thoughtfully with useful detail; do not repeat.",
      polish: "Polish for a premium social feed while keeping the author's voice.",
    };
    const out = await aiComplete([
      { role: "system", content: SYSTEM_BRAND },
      { role: "user", content: `${instr[data.mode]}\n\nText:\n${data.text}` },
    ], { temperature: 0.4 });
    return { text: out };
  });

export const translateText = createServerFn({ method: "POST" })
  .inputValidator((raw) =>
    z.object({
      text: z.string().trim().min(1).max(4000),
      target: z.string().trim().min(2).max(20).default("English"),
    }).parse(raw),
  )
  .handler(async ({ data }) => {
    const out = await aiComplete([
      { role: "system", content: SYSTEM_BRAND },
      { role: "user", content: `Translate to ${data.target}. Return only the translation, no notes.\n\n${data.text}` },
    ], { temperature: 0.2 });
    return { text: out };
  });

/* ────────────────────────────  CATEGORIZATION  ─────────────────────────── */

const CATEGORY_ENUM = [
  "sportbike", "cruiser", "adventure", "touring", "supermoto", "dirtbike",
  "cafe-racer", "electric", "vintage", "trackday", "motogp", "supercar",
  "muscle-car", "off-road", "drifting", "rally", "modification", "maintenance",
  "gear", "event", "meme", "other",
] as const;

export const categorizeContent = createServerFn({ method: "POST" })
  .inputValidator((raw) => z.object({ text: z.string().trim().min(1).max(2000) }).parse(raw))
  .handler(async ({ data }) => {
    const out = await aiCompleteJson<{ categories?: string[]; primary?: string; brands?: string[] }>([
      { role: "system", content: SYSTEM_BRAND },
      {
        role: "user",
        content:
          `Classify this post. Return JSON {"primary": string, "categories": string[1..3], "brands": string[]}. ` +
          `Categories must be from: ${CATEGORY_ENUM.join(", ")}. Brands are automotive manufacturers if clearly implied. ` +
          `Text: ${data.text}`,
      },
    ], { temperature: 0.2 });
    const valid = (out.categories ?? []).filter((c) => (CATEGORY_ENUM as readonly string[]).includes(c));
    return {
      primary: (CATEGORY_ENUM as readonly string[]).includes(out.primary ?? "") ? out.primary! : "other",
      categories: valid.length ? valid : ["other"],
      brands: (out.brands ?? []).slice(0, 6),
    };
  });

/* ────────────────────────────  MODERATION  ─────────────────────────── */

export const moderateContent = createServerFn({ method: "POST" })
  .inputValidator((raw) => z.object({ text: z.string().trim().min(1).max(4000) }).parse(raw))
  .handler(async ({ data }) => {
    const out = await aiCompleteJson<{
      flagged?: boolean;
      severity?: "low" | "medium" | "high";
      categories?: string[];
      reason?: string;
    }>([
      { role: "system", content: SYSTEM_BRAND },
      {
        role: "user",
        content:
          `Moderate this content for a social platform. Return JSON: ` +
          `{"flagged": bool, "severity": "low"|"medium"|"high", "categories": string[], "reason": string}. ` +
          `Categories may include: spam, scam, hate, harassment, sexual, violence, self-harm, misinformation, illegal, duplicate. ` +
          `Text: ${data.text}`,
      },
    ], { temperature: 0.1 });
    return {
      flagged: Boolean(out.flagged),
      severity: (out.severity ?? "low") as "low" | "medium" | "high",
      categories: out.categories ?? [],
      reason: out.reason ?? "",
    };
  });

/* ────────────────────────────  SMART SEARCH  ─────────────────────────── */

export const smartSearchParse = createServerFn({ method: "POST" })
  .inputValidator((raw) => z.object({ q: z.string().trim().min(1).max(200) }).parse(raw))
  .handler(async ({ data }) => {
    const out = await aiCompleteJson<{
      intent?: string;
      keywords?: string[];
      entities?: { type: string; value: string }[];
      surfaces?: string[];
    }>([
      { role: "system", content: SYSTEM_BRAND },
      {
        role: "user",
        content:
          `Parse this natural-language search query for ZOMBIEREX. Return JSON: ` +
          `{"intent": string, "keywords": string[], "entities": [{"type": "brand"|"model"|"year"|"location"|"category", "value": string}], "surfaces": ("posts"|"reels"|"listings"|"events"|"clubs"|"creators")[]}. ` +
          `Query: ${data.q}`,
      },
    ], { temperature: 0.2 });
    return {
      intent: out.intent ?? "search",
      keywords: out.keywords ?? [data.q],
      entities: out.entities ?? [],
      surfaces: out.surfaces ?? ["posts", "listings"],
    };
  });

export const autocompleteSearch = createServerFn({ method: "POST" })
  .inputValidator((raw) => z.object({ q: z.string().trim().min(1).max(80) }).parse(raw))
  .handler(async ({ data }) => {
    const out = await aiCompleteJson<{ suggestions?: string[] }>([
      { role: "system", content: SYSTEM_BRAND },
      {
        role: "user",
        content:
          `Return JSON {"suggestions": string[6]} — plausible search completions for a motorcycle/automotive social app. ` +
          `Short (max 40 chars each). Partial input: "${data.q}"`,
      },
    ], { temperature: 0.5 });
    return { suggestions: (out.suggestions ?? []).slice(0, 8) };
  });

export const trendingSearches = createServerFn({ method: "GET" })
  .handler(async () => {
    // Blend of live data (recent hashtags) + a small AI-curated seed.
    const sb = serverPublic();
    const { data } = await sb
      .from("hashtags")
      .select("tag, usage_count")
      .order("usage_count", { ascending: false })
      .limit(8);
    const live = (data ?? []).map((h) => `#${h.tag}`);
    const seed = [
      "trackday setup", "cafe racer builds", "adventure loops",
      "electric bikes", "vintage muscle", "sunday cruise",
    ];
    return { trending: [...live, ...seed].slice(0, 12) };
  });

/* ────────────────────────────  RECOMMENDATIONS  ─────────────────────────── */

/**
 * Personalized recommendations. Pulls a small candidate set from the DB,
 * then asks the model to rerank based on the user's recent activity signals.
 */
export const recommendedForYou = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z.object({
      surface: z.enum(["feed", "reels", "communities", "events", "marketplace", "creators", "hashtags", "users"]),
      limit: z.number().int().min(1).max(20).default(8),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Signal: recent reactions & follows.
    const [reactions, follows] = await Promise.all([
      supabase.from("reactions").select("post_id, kind").eq("user_id", userId).limit(30),
      supabase.from("follows").select("followee_id").eq("follower_id", userId).limit(30),
    ]);
    const signals = {
      reactions: reactions.data ?? [],
      follows: (follows.data ?? []).map((f) => f.followee_id as string),
    };

    // Candidates per surface. `any[]` here — payloads vary and are only serialized back to the client.
    let candidates: any[] = [];
    const sb = serverPublic();
    switch (data.surface) {
      case "feed":
      case "reels": {
        const r = await sb.from("posts").select("id, caption, kind, thumbnail_url, likes_count").order("created_at", { ascending: false }).limit(40);
        candidates = (r.data ?? []).filter((p: any) => data.surface === "reels" ? p.kind === "video" : true);
        break;
      }
      case "communities": {
        const r = await sb.from("clubs").select("id, slug, name, description, members_count, banner_url").order("members_count", { ascending: false }).limit(30);
        candidates = r.data ?? [];
        break;
      }
      case "events": {
        const r = await sb.from("events").select("id, title, starts_at, location, cover_url").gte("starts_at", new Date().toISOString()).order("starts_at").limit(30);
        candidates = r.data ?? [];
        break;
      }
      case "marketplace": {
        const r = await sb.from("listings").select("id, title, price_cents, currency, hero_image_url, category").eq("status", "active").order("created_at", { ascending: false }).limit(30);
        candidates = r.data ?? [];
        break;
      }
      case "creators": {
        const r = await sb.from("creator_profiles").select("id, user_id, category, tagline, subscribers_count").order("subscribers_count", { ascending: false }).limit(30);
        candidates = r.data ?? [];
        break;
      }
      case "hashtags": {
        const r = await sb.from("hashtags").select("tag, usage_count").order("usage_count", { ascending: false }).limit(30);
        candidates = r.data ?? [];
        break;
      }
      case "users": {
        const r = await sb.from("profiles").select("id, handle, display_name, avatar_url, tier, bio").limit(40);
        candidates = (r.data ?? []).filter((p: any) => p.id !== userId && !signals.follows.includes(p.id as string));
        break;
      }
    }

    if (candidates.length <= data.limit) return { items: candidates };

    // Ask the model to rerank by ids.
    const compact = candidates.slice(0, 30).map((c, i) => ({ i, ...c }));
    try {
      const out = await aiCompleteJson<{ order?: number[] }>([
        { role: "system", content: SYSTEM_BRAND },
        {
          role: "user",
          content:
            `Rerank these ${data.surface} candidates for a motorcycle/automotive enthusiast. ` +
            `User has reacted ${signals.reactions.length} times and follows ${signals.follows.length} people. ` +
            `Return JSON {"order": number[]} — a permutation of indices, best first. ` +
            `Candidates: ${JSON.stringify(compact)}`,
        },
      ], { temperature: 0.3 });
      const order = (out.order ?? []).filter((n) => Number.isInteger(n) && n >= 0 && n < compact.length);
      const seen = new Set<number>();
      const ranked: Array<Record<string, unknown>> = [];
      for (const i of order) {
        if (!seen.has(i)) { seen.add(i); ranked.push(candidates[i]); }
      }
      // Fill any leftovers.
      for (let i = 0; i < candidates.length && ranked.length < data.limit; i++) {
        if (!seen.has(i)) ranked.push(candidates[i]);
      }
      return { items: ranked.slice(0, data.limit) };
    } catch {
      // Fallback: original order.
      return { items: candidates.slice(0, data.limit) };
    }
  });

/* ─────────────────────────────  ONBOARDING  ───────────────────────────── */

export const onboardingRecommendations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z.object({
      interests: z.array(z.string().trim().min(1).max(40)).max(12),
    }).parse(raw),
  )
  .handler(async ({ data }) => {
    const sb = serverPublic();
    const [clubs, events, listings, creators] = await Promise.all([
      sb.from("clubs").select("id, slug, name, description, members_count, banner_url").order("members_count", { ascending: false }).limit(20),
      sb.from("events").select("id, title, starts_at, location, cover_url").gte("starts_at", new Date().toISOString()).order("starts_at").limit(20),
      sb.from("listings").select("id, title, price_cents, currency, hero_image_url, category").eq("status", "active").limit(20),
      sb.from("creator_profiles").select("id, user_id, category, tagline, subscribers_count").order("subscribers_count", { ascending: false }).limit(20),
    ]);

    try {
      const out = await aiCompleteJson<{
        clubs?: string[]; events?: string[]; listings?: string[]; creators?: string[];
      }>([
        { role: "system", content: SYSTEM_BRAND },
        {
          role: "user",
          content:
            `Recommend items for a new user with interests: ${data.interests.join(", ") || "(unspecified)"}. ` +
            `Return JSON {"clubs": id[], "events": id[], "listings": id[], "creators": id[]} using ids from the candidate pools; up to 5 each, best first. ` +
            `Pools: ${JSON.stringify({
              clubs: (clubs.data ?? []).map((c: any) => ({ id: c.id, name: c.name, description: c.description })),
              events: (events.data ?? []).map((e: any) => ({ id: e.id, title: e.title, location: e.location })),
              listings: (listings.data ?? []).map((l: any) => ({ id: l.id, title: l.title, category: l.category })),
              creators: (creators.data ?? []).map((c: any) => ({ id: c.id, category: c.category, tagline: c.tagline })),
            })}`,
        },
      ], { temperature: 0.4 });

      const pick = <T extends { id: string }>(all: T[] | null | undefined, ids: string[] | undefined) => {
        const list = (all ?? []) as T[];
        const map = new Map(list.map((x) => [x.id, x]));
        const chosen = (ids ?? []).map((id) => map.get(id)).filter(Boolean) as T[];
        if (chosen.length) return chosen.slice(0, 5);
        return list.slice(0, 5);
      };
      return {
        clubs: pick(clubs.data as any, out.clubs),
        events: pick(events.data as any, out.events),
        listings: pick(listings.data as any, out.listings),
        creators: pick(creators.data as any, out.creators),
      };
    } catch {
      return {
        clubs: (clubs.data ?? []).slice(0, 5),
        events: (events.data ?? []).slice(0, 5),
        listings: (listings.data ?? []).slice(0, 5),
        creators: (creators.data ?? []).slice(0, 5),
      };
    }
  });

/* ─────────────────────────────  REX ASSISTANT  ───────────────────────────── */

const ASSISTANT_SYSTEM = `${SYSTEM_BRAND}

You help users inside the ZOMBIEREX app. When useful, suggest specific in-app destinations by mentioning their path:
- Home feed: /
- Reels: /reels
- Communities (crews): /communities
- Events: /events
- Marketplace (Vault): /marketplace
- Creators: /creators
- Search: /search
- Menu hub: /menu
- Post something: /post/new
- List for sale: /marketplace/new
- Create a community: /communities/create
- Ads Manager: /ads
- Settings: /settings
- Profile (Garage): /profile

Keep replies short (2-6 sentences) unless the user asks for depth. Use plain language.`;

export const assistantChat = createServerFn({ method: "POST" })
  .inputValidator((raw) =>
    z.object({
      messages: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      })).min(1).max(20),
    }).parse(raw),
  )
  .handler(async ({ data }) => {
    const msgs: ChatMessage[] = [
      { role: "system", content: ASSISTANT_SYSTEM },
      ...data.messages,
    ];
    const text = await aiComplete(msgs, { temperature: 0.7, maxTokens: 600 });
    return { text };
  });
