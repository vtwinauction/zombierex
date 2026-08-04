/**
 * Cloudflare Stream client upload.
 *
 * Videos bypass our storage bucket entirely: the client POSTs the file to a
 * one-time direct-upload URL, Cloudflare transcodes it to adaptive HLS, and we
 * poll `video_assets` until the manifest is ready.
 *
 * Returns null when streaming isn't configured — callers fall back to the
 * plain storage upload path so the composer never hard-fails.
 */
import { requestVideoUpload, getVideoAsset } from "./video.functions";
import type { UploadProgress } from "./media-upload";

export type StreamUploadResult = {
  url: string; // HLS manifest
  thumbnailUrl?: string;
  uid: string;
  durationSeconds?: number;
};

export type StreamUploadOptions = {
  maxDurationSeconds?: number;
  onProgress?: (p: UploadProgress) => void;
  onProcessing?: () => void;
  signal?: AbortSignal;
};

const POLL_INTERVAL = 2500;
const POLL_TIMEOUT = 5 * 60 * 1000;

export async function uploadVideoToStream(
  file: File,
  opts: StreamUploadOptions = {},
): Promise<StreamUploadResult | null> {
  let ticket: { uid: string; upload_url: string };
  try {
    ticket = await requestVideoUpload({
      data: { max_duration_seconds: Math.round(opts.maxDurationSeconds ?? 90) },
    });
  } catch {
    return null; // not configured → caller falls back to storage upload
  }

  const form = new FormData();
  form.append("file", file, file.name);

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", ticket.upload_url, true);
    if (opts.signal) opts.signal.addEventListener("abort", () => xhr.abort());
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      opts.onProgress?.({
        loaded: e.loaded,
        total: e.total,
        pct: e.total ? e.loaded / e.total : 0,
      });
    };
    xhr.onerror = () => reject(new Error("Network error during video upload"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Video upload failed [${xhr.status}]`));
    xhr.send(form);
  });

  opts.onProcessing?.();

  const started = Date.now();
  while (Date.now() - started < POLL_TIMEOUT) {
    if (opts.signal?.aborted) throw new Error("Upload cancelled");
    const asset: any = await getVideoAsset({ data: { uid: ticket.uid } }).catch(() => null);
    if (asset?.status === "ready" && asset.playback_hls) {
      return {
        url: asset.playback_hls,
        thumbnailUrl: asset.thumbnail_url ?? undefined,
        uid: ticket.uid,
        durationSeconds: asset.duration_seconds ?? undefined,
      };
    }
    if (asset?.status === "error") {
      throw new Error(asset.error_message || "Video processing failed");
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }
  throw new Error("Video is still processing — try again in a moment.");
}
