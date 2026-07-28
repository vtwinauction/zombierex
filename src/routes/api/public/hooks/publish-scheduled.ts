/**
 * Scheduled posts publisher — called every minute by pg_cron.
 *
 * Picks up scheduled_posts where status='scheduled' AND publish_at <= now(),
 * inserts them into posts, and marks the row published (or errored).
 * Guarded by the Supabase anon apikey set by pg_cron.
 */
import { createFileRoute } from "@tanstack/react-router";

const BATCH = 100;

export const Route = createFileRoute("/api/public/hooks/publish-scheduled")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const anon = process.env.SUPABASE_PUBLISHABLE_KEY;
        const apikey = request.headers.get("apikey") ?? "";
        if (!anon || apikey !== anon) return new Response("Unauthorized", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const nowIso = new Date().toISOString();
        const { data: due, error } = await supabaseAdmin
          .from("scheduled_posts")
          .select("id, author_id, kind, caption, media_urls, hashtags, visibility, is_subscribers_only, club_id")
          .eq("status", "scheduled")
          .lte("publish_at", nowIso)
          .order("publish_at", { ascending: true })
          .limit(BATCH);
        if (error) return new Response(`db: ${error.message}`, { status: 500 });
        if (!due || due.length === 0) return Response.json({ ok: true, published: 0 });

        let published = 0;
        let failed = 0;

        for (const s of due) {
          const media = Array.isArray(s.media_urls) ? s.media_urls : [];
          const kind = ["video", "photo", "telemetry", "event"].includes(s.kind) ? s.kind : "photo";
          const insertRow: Record<string, unknown> = {
            author_id: s.author_id,
            kind,
            caption: s.caption ?? null,
            media_url: media[0] ?? null,
          };

          const { data: post, error: insErr } = await supabaseAdmin
            .from("posts")
            .insert(insertRow)
            .select("id")
            .single();

          if (insErr || !post) {
            failed++;
            await supabaseAdmin
              .from("scheduled_posts")
              .update({ status: "failed", error: insErr?.message ?? "insert failed" })
              .eq("id", s.id);
            continue;
          }

          // Attach hashtags if any
          const tags = (s.hashtags ?? []).filter((t): t is string => typeof t === "string" && t.length > 0);
          if (tags.length) {
            const uniq = Array.from(new Set(tags.map((t) => t.replace(/^#/, "").toLowerCase()))).slice(0, 30);
            const { data: hashRows } = await supabaseAdmin
              .from("hashtags")
              .upsert(uniq.map((tag) => ({ tag })), { onConflict: "tag" })
              .select("id, tag");
            if (hashRows?.length) {
              await supabaseAdmin
                .from("post_hashtags")
                .insert(hashRows.map((h) => ({ post_id: post.id, hashtag_id: h.id })));
            }
          }

          await supabaseAdmin
            .from("scheduled_posts")
            .update({ status: "published", published_post_id: post.id, error: null })
            .eq("id", s.id);
          published++;
        }

        return Response.json({ ok: true, processed: due.length, published, failed });
      },
    },
  },
});
