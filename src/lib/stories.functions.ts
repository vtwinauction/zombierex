import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function publicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
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

export const listActiveStories = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb
    .from("stories")
    .select("id, author_id, kind, media_url, thumbnail_url, caption, label, created_at, expires_at")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));
  let profilesById = new Map<string, { id: string; display_name: string | null; handle: string | null; avatar_url: string | null; is_verified: boolean | null }>();
  if (authorIds.length) {
    const { data: profs, error: pErr } = await sb
      .from("profiles_public")
      .select("id, display_name, handle, avatar_url, is_verified")
      .in("id", authorIds);
    if (pErr) throw new Error(pErr.message);
    profilesById = new Map((profs ?? []).map((p) => [p.id, p]));
  }
  const items = rows.map((r) => ({ ...r, author: profilesById.get(r.author_id) ?? null }));
  return { items };
});

export const createStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        media_url: z.string().url(),
        thumbnail_url: z.string().url().optional(),
        kind: z.enum(["photo", "video", "ride", "event", "poll", "question"]).default("photo"),
        caption: z.string().max(500).optional(),
        label: z.string().max(60).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: row, error } = await sb
      .from("stories")
      .insert({
        author_id: context.userId,
        kind: data.kind,
        media_url: data.media_url,
        thumbnail_url: data.thumbnail_url ?? null,
        caption: data.caption ?? null,
        label: data.label ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const deleteStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { error } = await sb.from("stories").delete().eq("id", data.id).eq("author_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
