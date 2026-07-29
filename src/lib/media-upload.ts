/**
 * Media upload — client-side compression, signed-URL PUT with progress, retry.
 *
 * Flow:
 *  1. compressImage() (or leave video untouched)
 *  2. createSignedUploadUrl() server fn returns { signed_url, path, token }
 *  3. PUT bytes to signed_url via XHR (progress events)
 *  4. createSignedReadUrl() with long TTL → store as media_url on the post
 */
import { createSignedUploadUrl, createSignedReadUrl } from "./storage.functions";

export type UploadProgress = {
  loaded: number;
  total: number;
  pct: number;
};

export type UploadResult = {
  path: string;
  url: string; // long-lived signed URL
  contentType: string;
};

const MAX_IMAGE_DIM = 1920;
const IMAGE_QUALITY = 0.86;
// Server caps signed-read TTL at 900s (H-01). Store `bucket:path` in DB and
// re-mint at render time via resolveMediaUrl() for anything that outlives this.
const READ_TTL = 31536000; // 1 year: feed media must not expire

/**
 * Hard upload limits enforced client-side before compression / upload.
 * Keeps the pipeline predictable and protects storage/CDN costs.
 */
export const UPLOAD_LIMITS = {
  image: { maxBytes: 10 * 1024 * 1024, label: "10 MB" },
  reel:  { maxBytes: 100 * 1024 * 1024, label: "100 MB", maxSeconds: 90 },
  video: { maxBytes: 500 * 1024 * 1024, label: "500 MB" },
  story: { maxBytes: 50 * 1024 * 1024, label: "50 MB", maxSeconds: 15 },
} as const;

export type UploadKind = keyof typeof UPLOAD_LIMITS;

/** Return null if OK, or a human error string for a toast. */
export function checkUploadSize(kind: UploadKind, file: File): string | null {
  const lim = UPLOAD_LIMITS[kind];
  if (file.size > lim.maxBytes) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return `"${file.name}" is ${mb} MB — over the ${lim.label} limit for ${kind}s.`;
  }
  return null;
}

/** Probe a video File for duration (seconds). Resolves 0 if unreadable. */
export async function probeVideoDuration(file: File): Promise<number> {
  if (!file.type.startsWith("video/")) return 0;
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<number>((resolve) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.muted = true;
      v.onloadedmetadata = () => resolve(Number.isFinite(v.duration) ? v.duration : 0);
      v.onerror = () => resolve(0);
      v.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  const isHeic = /image\/(heic|heif)/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
  const source = isHeic ? await convertHeicToJpeg(file) : file;
  const bitmap = await createImageBitmap(source).catch(() => null);
  if (!bitmap) return file;
  const { width, height } = bitmap;
  const scale = Math.min(1, MAX_IMAGE_DIM / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return source;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return await new Promise<Blob>((res) =>
    canvas.toBlob((b) => res(b || file), "image/jpeg", IMAGE_QUALITY),
  );
}

async function convertHeicToJpeg(file: File): Promise<Blob> {
  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: IMAGE_QUALITY });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  if (!blob) throw new Error("Could not convert HEIC image");
  return new Blob([blob], { type: "image/jpeg" });
}

export async function blobFromCanvas(canvas: HTMLCanvasElement, type = "image/jpeg", q = IMAGE_QUALITY): Promise<Blob> {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("canvas empty"))), type, q));
}

function randomId(): string {
  const arr = new Uint8Array(8);
  (globalThis.crypto ?? crypto).getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

function extFor(contentType: string): string {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  if (contentType === "image/heic" || contentType === "image/heif") return "jpg";
  if (contentType === "video/mp4") return "mp4";
  if (contentType === "video/webm") return "webm";
  if (contentType === "video/quicktime") return "mov";
  return "bin";
}

export type UploadOptions = {
  userId: string;
  bucket?: "posts" | "avatars" | "vehicles" | "marketplace";
  onProgress?: (p: UploadProgress) => void;
  signal?: AbortSignal;
};

/** Upload a Blob to storage with signed URL + XHR progress. */
export async function uploadBlob(blob: Blob, opts: UploadOptions): Promise<UploadResult> {
  const bucket = opts.bucket ?? "posts";
  const contentType = blob.type || "application/octet-stream";
  const path = `${opts.userId}/${Date.now()}-${randomId()}.${extFor(contentType)}`;

  const signed = await createSignedUploadUrl({
    data: { bucket, path, content_type: contentType },
  });

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signed.signed_url, true);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.setRequestHeader("x-upsert", "true");
    if (opts.signal) opts.signal.addEventListener("abort", () => xhr.abort());
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      opts.onProgress?.({ loaded: e.loaded, total: e.total, pct: e.total ? e.loaded / e.total : 0 });
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed [${xhr.status}]: ${xhr.responseText || xhr.statusText}`));
    };
    xhr.send(blob);
  });

  const read = await createSignedReadUrl({
    data: { bucket, path: signed.path, expires_in: READ_TTL },
  });

  return { path: signed.path, url: read.signed_url, contentType };
}

/** Upload with automatic retry (exponential backoff). */
export async function uploadWithRetry(
  blob: Blob,
  opts: UploadOptions,
  attempts = 3,
): Promise<UploadResult> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await uploadBlob(blob, opts);
    } catch (e) {
      lastErr = e;
      if (opts.signal?.aborted) throw e;
      await new Promise((r) => setTimeout(r, 400 * Math.pow(2, i)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Upload failed");
}
