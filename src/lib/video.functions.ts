/**
 * Video pipeline — Cloudflare Stream.
 *
 * Flow:
 *  1. requestVideoUpload() → one-time direct-upload URL (client PUTs the file
 *     straight to Cloudflare, never through our server)
 *  2. Cloudflare transcodes to adaptive HLS/DASH and calls
 *     /api/public/webhooks/stream when the asset is ready
 *  3. getVideoAsset() polls status so the composer can show progress and then
 *     store the HLS URL as the post's media_url
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CF_API = "https://api.cloudflare.com/client/v4";

/** Max seconds we accept for a reel/post upload. */
const MAX_DURATION = 600;

export const requestVideoUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        max_duration_seconds: z.number().int().min(1).max(MAX_DURATION).default(90),
        post_id: z.string().uuid().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const token = process.env.CLOUDFLARE_STREAM_TOKEN;
    if (!accountId || !token) {
      throw new Error("Video streaming is not configured yet.");
    }

    const res = await fetch(`${CF_API}/accounts/${accountId}/stream/direct_upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        maxDurationSeconds: data.max_duration_seconds,
        requireSignedURLs: false,
        creator: context.userId,
        meta: { userId: context.userId, postId: data.post_id ?? null },
      }),
    });

    const json: any = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.errors?.[0]?.message ?? "Could not start the video upload.");
    }

    const uid: string = json.result.uid;
    const uploadUrl: string = json.result.uploadURL;

    const { error } = await context.supabase.from("video_assets").insert({
      owner_id: context.userId,
      post_id: data.post_id ?? null,
      provider: "cloudflare",
      provider_uid: uid,
      status: "uploading",
    });
    if (error) throw new Error(error.message);

    return { uid, upload_url: uploadUrl };
  });

export const getVideoAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ uid: z.string().min(4).max(128) }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("video_assets")
      .select(
        "provider_uid, status, playback_hls, playback_dash, thumbnail_url, duration_seconds, width, height, error_message",
      )
      .eq("provider_uid", data.uid)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ?? null;
  });

export const attachVideoToPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z.object({ uid: z.string().min(4).max(128), post_id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("video_assets")
      .update({ post_id: data.post_id })
      .eq("provider_uid", data.uid)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
