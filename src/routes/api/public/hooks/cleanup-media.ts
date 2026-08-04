/**
 * Scheduled media/storage cleanup.
 *
 * Called by pg_cron hourly. Purges:
 *  - expired stories + their storage objects
 *  - storage objects belonging to posts soft-deleted >7 days ago (then hard-deletes the post)
 *
 * Auth: dedicated CRON_SECRET header header (routes under /api/public bypass auth at
 * the edge; we still verify the header matches the configured publishable key).
 */
import { createFileRoute } from "@tanstack/react-router";
import { requireCronSecret } from "@/lib/cron-auth.server";
import { createClient } from "@supabase/supabase-js";

type BucketPath = { bucket: string; path: string };

/** Parse a Supabase Storage signed/public URL into { bucket, path }. */
function parseStorageUrl(url: string | null | undefined): BucketPath | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    // /storage/v1/object/{sign|public|authenticated}/<bucket>/<path>
    const m = u.pathname.match(
      /\/storage\/v1\/object\/(?:sign|public|authenticated)\/([^/]+)\/(.+)$/,
    );
    if (!m) return null;
    return { bucket: m[1], path: decodeURIComponent(m[2]) };
  } catch {
    return null;
  }
}

function groupByBucket(items: (BucketPath | null)[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const it of items) {
    if (!it) continue;
    (out[it.bucket] ??= []).push(it.path);
  }
  return out;
}

export const Route = createFileRoute("/api/public/hooks/cleanup-media")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = requireCronSecret(request);
        if (denied) return denied;

        const url = process.env.SUPABASE_URL!;
        const svc = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const admin = createClient(url, svc, { auth: { persistSession: false } });

        const summary = { stories: 0, posts: 0, objects: 0, errors: [] as string[] };

        // Expired stories
        {
          const { data, error } = await admin
            .from("stories")
            .select("id, media_url, thumbnail_url")
            .lt("expires_at", new Date().toISOString())
            .limit(500);
          if (error) summary.errors.push(`stories:${error.message}`);
          const rows = data ?? [];
          const paths = groupByBucket(
            rows.flatMap((r) => [parseStorageUrl(r.media_url), parseStorageUrl(r.thumbnail_url)]),
          );
          for (const [bucket, list] of Object.entries(paths)) {
            if (!list.length) continue;
            const { error: rmErr } = await admin.storage.from(bucket).remove(list);
            if (rmErr) summary.errors.push(`rm ${bucket}:${rmErr.message}`);
            else summary.objects += list.length;
          }
          if (rows.length) {
            const { error: delErr } = await admin
              .from("stories")
              .delete()
              .in(
                "id",
                rows.map((r) => r.id),
              );
            if (delErr) summary.errors.push(`stories delete:${delErr.message}`);
            else summary.stories = rows.length;
          }
        }

        // Soft-deleted posts older than 7 days
        {
          const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
          const { data, error } = await admin
            .from("posts")
            .select("id, media_url, thumbnail_url")
            .not("deleted_at", "is", null)
            .lt("deleted_at", cutoff)
            .limit(500);
          if (error) summary.errors.push(`posts:${error.message}`);
          const rows = data ?? [];
          const paths = groupByBucket(
            rows.flatMap((r) => [parseStorageUrl(r.media_url), parseStorageUrl(r.thumbnail_url)]),
          );
          for (const [bucket, list] of Object.entries(paths)) {
            if (!list.length) continue;
            const { error: rmErr } = await admin.storage.from(bucket).remove(list);
            if (rmErr) summary.errors.push(`rm ${bucket}:${rmErr.message}`);
            else summary.objects += list.length;
          }
          if (rows.length) {
            const { error: delErr } = await admin
              .from("posts")
              .delete()
              .in(
                "id",
                rows.map((r) => r.id),
              );
            if (delErr) summary.errors.push(`posts delete:${delErr.message}`);
            else summary.posts = rows.length;
          }
        }

        return Response.json({ ok: true, ...summary, ranAt: new Date().toISOString() });
      },
    },
  },
});
