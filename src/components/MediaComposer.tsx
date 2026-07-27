/**
 * MediaComposer — full-screen post editing studio.
 *
 * Capabilities (image):
 *  - Native picker + camera capture (gallery, photo, video).
 *  - Multi-select, drag to reorder, remove.
 *  - Rotate 90°, aspect-crop centered (square/4:5/16:9/original).
 *  - Filter presets (Chrome/Fade/Mono/Noir/Warm/Cool/Vivid).
 *  - Adjustments: brightness, contrast, saturation, exposure, highlights, shadows.
 *  - Text overlay + freehand drawing baked into the exported JPEG.
 *
 * Capabilities (video, non-destructive metadata):
 *  - Trim start/end, mute, playback speed, cover-frame preview.
 *
 * Publish:
 *  - Compress → upload (signed URL + XHR progress + retry) → createPost.
 *  - Save draft (localStorage). Schedule stored on the draft; the client
 *    surfaces scheduled drafts on the composer's drafts screen.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { blobFromCanvas, compressImage, uploadWithRetry, type UploadProgress } from "@/lib/media-upload";
import { saveDraft, type PostDraft } from "@/lib/post-drafts";
import { createPost } from "@/lib/feed.functions";
import { createStory } from "@/lib/stories.functions";
import { moderateImage } from "@/lib/moderation-image.functions";
import { checkTextSafety } from "@/lib/moderation-text.functions";
import { MusicLibrary, type SelectedTrack } from "@/components/MusicLibrary";
import { formatDuration } from "@/lib/music-library";


type EditorAdjust = {
  brightness: number; // 1 = neutral
  contrast: number;
  saturation: number;
  exposure: number;   // extra brightness
  highlights: number; // subtle contrast on top-end
  shadows: number;    // subtle contrast on bottom-end
};

const FILTERS = [
  { id: "none", label: "Original", css: "" },
  { id: "chrome", label: "Chrome", css: "saturate(1.15) contrast(1.05)" },
  { id: "fade", label: "Fade", css: "saturate(0.85) contrast(0.95) brightness(1.05)" },
  { id: "mono", label: "Mono", css: "grayscale(1) contrast(1.1)" },
  { id: "noir", label: "Noir", css: "grayscale(1) contrast(1.35) brightness(0.9)" },
  { id: "warm", label: "Warm", css: "sepia(0.3) saturate(1.1)" },
  { id: "cool", label: "Cool", css: "hue-rotate(-10deg) saturate(1.05)" },
  { id: "vivid", label: "Vivid", css: "saturate(1.45) contrast(1.1)" },
] as const;

const ASPECTS = [
  { id: "orig", label: "Original", ratio: null as number | null },
  { id: "1:1", label: "Square", ratio: 1 },
  { id: "4:5", label: "4:5", ratio: 4 / 5 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
] as const;

type Overlay = {
  id: string;
  text: string;
  x: number; // 0..1
  y: number;
  size: number; // px in preview
  color: string;
};

type Stroke = { color: string; size: number; points: Array<{ x: number; y: number }> };

type MediaItem = {
  id: string;
  kind: "image" | "video";
  file: File;
  previewUrl: string;
  rotation: 0 | 90 | 180 | 270;
  aspect: (typeof ASPECTS)[number]["id"];
  filter: (typeof FILTERS)[number]["id"];
  adjust: EditorAdjust;
  overlays: Overlay[];
  strokes: Stroke[];
  // video-only (metadata; server render worker will apply these)
  trimStart?: number;
  trimEnd?: number;
  muted?: boolean;
  speed?: number;
  coverAt?: number;      // seconds — frame to use as thumbnail_url
  coverBlobUrl?: string; // in-memory object URL of extracted cover
};

const defaultAdjust: EditorAdjust = {
  brightness: 1, contrast: 1, saturation: 1, exposure: 0, highlights: 0, shadows: 0,
};

function newItem(file: File): MediaItem {
  const kind: MediaItem["kind"] = file.type.startsWith("video/") ? "video" : "image";
  return {
    id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    kind, file,
    previewUrl: URL.createObjectURL(file),
    rotation: 0, aspect: "orig", filter: "none",
    adjust: { ...defaultAdjust },
    overlays: [], strokes: [],
    trimStart: kind === "video" ? 0 : undefined,
    trimEnd: kind === "video" ? undefined : undefined,
    muted: false, speed: 1,
    coverAt: kind === "video" ? 0 : undefined,
  };
}

/* ------------ Post-type flow (Prompt 9) ------------ */

export type PostType = "post" | "reel" | "story" | "telemetry";

const POST_TYPE_META: Record<PostType, {
  label: string;
  tag: string;
  desc: string;
  accept: string;
  maxItems: number;
  requiresMedia: boolean;
}> = {
  post: {
    label: "Post",
    tag: "FEED · PERMANENT",
    desc: "1–10 photos or one video. Any aspect. Lives in your feed forever.",
    accept: "image/*,video/*",
    maxItems: 10,
    requiresMedia: false, // text-only allowed
  },
  reel: {
    label: "Reel",
    tag: "VERTICAL · 9:16 · ≤90s",
    desc: "One vertical video, up to 90 seconds. Plays in the Reels feed.",
    accept: "video/*",
    maxItems: 1,
    requiresMedia: true,
  },
  story: {
    label: "Story",
    tag: "EPHEMERAL · 24H · ≤15s",
    desc: "One photo or short vertical clip. Disappears in 24 hours.",
    accept: "image/*,video/*",
    maxItems: 1,
    requiresMedia: true,
  },
  telemetry: {
    label: "Telemetry",
    tag: "RIDE · DRAG · DATA",
    desc: "Publish a ride or drag session as a data post. Pulls from your latest session.",
    accept: "",
    maxItems: 0,
    requiresMedia: false,
  },
};

const POST_TYPE_STORAGE_KEY = "zrex:composer.lastType";

function loadLastPostType(): PostType {
  if (typeof window === "undefined") return "post";
  try {
    const v = window.localStorage.getItem(POST_TYPE_STORAGE_KEY);
    if (v === "post" || v === "reel" || v === "story" || v === "telemetry") return v;
  } catch { /* ignore */ }
  return "post";
}

function persistLastPostType(t: PostType) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(POST_TYPE_STORAGE_KEY, t); } catch { /* ignore */ }
}

/** Extract a single frame from a video File at the given time as a JPEG Blob. */
async function extractVideoFrame(file: File, atSec: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "auto"; v.muted = true; v.playsInline = true; v.src = url;
    const cleanup = () => { try { URL.revokeObjectURL(url); } catch { /* noop */ } };
    v.onloadedmetadata = () => {
      const t = Math.max(0, Math.min(atSec, (v.duration || 0) - 0.05));
      v.currentTime = t;
    };
    v.onseeked = () => {
      try {
        const c = document.createElement("canvas");
        c.width = v.videoWidth; c.height = v.videoHeight;
        c.getContext("2d")!.drawImage(v, 0, 0);
        c.toBlob((b) => {
          cleanup();
          b ? resolve(b) : reject(new Error("Cover frame export failed"));
        }, "image/jpeg", 0.85);
      } catch (e) { cleanup(); reject(e as Error); }
    };
    v.onerror = () => { cleanup(); reject(new Error("Video load failed")); };
  });
}


function filterCss(m: MediaItem): string {
  const preset = FILTERS.find((f) => f.id === m.filter)?.css ?? "";
  const a = m.adjust;
  const b = (a.brightness * (1 + a.exposure)).toFixed(3);
  return [
    preset,
    `brightness(${b})`,
    `contrast(${(a.contrast + a.highlights * 0.15).toFixed(3)})`,
    `saturate(${a.saturation.toFixed(3)})`,
    a.shadows ? `drop-shadow(0 0 0 rgba(0,0,0,${Math.min(0.4, a.shadows * 0.4)}))` : "",
  ].filter(Boolean).join(" ");
}

type Props = { onDone?: () => void };

export function MediaComposer({ onDone }: Props) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [active, setActive] = useState(0);
  const [caption, setCaption] = useState("");
  const [tab, setTab] = useState<"filters" | "adjust" | "text" | "draw" | "music" | "video">("filters");
  const [showPreview, setShowPreview] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [music, setMusic] = useState<SelectedTrack | null>(null);
  const [progress, setProgress] = useState<Record<string, UploadProgress>>({});
  const [failed, setFailed] = useState<string[]>([]);
  const [scheduleAt, setScheduleAt] = useState<string>("");
  const [postAsStory, setPostAsStory] = useState(false);
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null);
  const pickGallery = useRef<HTMLInputElement>(null);
  const pickCamera = useRef<HTMLInputElement>(null);
  const pickVideo = useRef<HTMLInputElement>(null);

  const post = useServerFn(createPost);
  const postStory = useServerFn(createStory);
  const moderate = useServerFn(moderateImage);
  const moderateCaption = useServerFn(checkTextSafety);
  const queryClient = useQueryClient();

  const activeItem = items[active];

  useEffect(() => () => items.forEach((i) => URL.revokeObjectURL(i.previewUrl)), []); // cleanup on unmount

  const addFiles = useCallback((files: FileList | null) => {
    if (!files || !files.length) return;
    const next = Array.from(files).slice(0, 10 - items.length).map(newItem);
    setItems((prev) => [...prev, ...next]);
    if (!items.length && next.length) setActive(0);
  }, [items.length]);

  // Consume camera capture handed off from the status-bar long-press
  useEffect(() => {
    const raw = typeof window !== "undefined" ? sessionStorage.getItem("zrex:capture") : null;
    if (!raw) return;
    sessionStorage.removeItem("zrex:capture");
    try {
      const payload = JSON.parse(raw) as { url: string; type: string; name: string };
      (async () => {
        const res = await fetch(payload.url);
        const blob = await res.blob();
        const file = new File([blob], payload.name || "capture", { type: payload.type || blob.type });
        try { URL.revokeObjectURL(payload.url); } catch { /* noop */ }
        const dt = new DataTransfer();
        dt.items.add(file);
        addFiles(dt.files);
      })().catch(() => { /* noop */ });
    } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const patchActive = (patch: Partial<MediaItem>) =>
    setItems((prev) => prev.map((it, i) => (i === active ? { ...it, ...patch } : it)));

  const patchAdjust = (patch: Partial<EditorAdjust>) =>
    setItems((prev) => prev.map((it, i) => (i === active ? { ...it, adjust: { ...it.adjust, ...patch } } : it)));

  const removeAt = (i: number) => {
    URL.revokeObjectURL(items[i].previewUrl);
    setItems((prev) => prev.filter((_, idx) => idx !== i));
    setActive((a) => Math.max(0, Math.min(a, items.length - 2)));
  };

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= items.length) return;
    setItems((prev) => {
      const copy = [...prev];
      const [x] = copy.splice(from, 1);
      copy.splice(to, 0, x);
      return copy;
    });
    setActive(to);
  };

  // ---- Export image with all edits baked in ----
  const exportImage = useCallback(async (m: MediaItem): Promise<Blob> => {
    const img = await createImageBitmap(m.file);
    const rot = m.rotation;
    const swap = rot === 90 || rot === 270;
    const iw = swap ? img.height : img.width;
    const ih = swap ? img.width : img.height;
    const ratio = ASPECTS.find((a) => a.id === m.aspect)?.ratio ?? null;
    let outW = iw, outH = ih;
    if (ratio) {
      const curr = iw / ih;
      if (curr > ratio) outW = Math.round(ih * ratio);
      else outH = Math.round(iw / ratio);
    }
    const maxDim = 1920;
    const s = Math.min(1, maxDim / Math.max(outW, outH));
    outW = Math.round(outW * s); outH = Math.round(outH * s);
    const canvas = document.createElement("canvas");
    canvas.width = outW; canvas.height = outH;
    const ctx = canvas.getContext("2d")!;
    ctx.save();
    (ctx as any).filter = filterCss(m) || "none";
    // draw rotated + cropped
    ctx.translate(outW / 2, outH / 2);
    ctx.rotate((rot * Math.PI) / 180);
    const drawW = swap ? outH : outW;
    const drawH = swap ? outW : outH;
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
    // strokes
    for (const st of m.strokes) {
      ctx.strokeStyle = st.color;
      ctx.lineWidth = st.size;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath();
      st.points.forEach((p, i) => {
        const x = p.x * outW; const y = p.y * outH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
    // text overlays
    for (const o of m.overlays) {
      ctx.fillStyle = o.color;
      ctx.font = `700 ${Math.round(o.size * (outW / 400))}px 'Space Grotesk', system-ui, sans-serif`;
      ctx.textBaseline = "top";
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = 8;
      ctx.fillText(o.text, o.x * outW, o.y * outH);
      ctx.shadowBlur = 0;
    }
    img.close?.();
    const raw = await blobFromCanvas(canvas, "image/jpeg", 0.88);
    return await compressImage(new File([raw], "edit.jpg", { type: "image/jpeg" }));
  }, []);

  // ---- Publish ----
  const publish = useMutation({
    mutationFn: async () => {
      const { data: sess } = await supabase.auth.getUser();
      const userId = sess.user?.id;
      if (!userId) throw new Error("Not signed in");
      if (!items.length && !caption.trim()) throw new Error("Add media or a caption");

      setFailed([]);
      const uploaded: Array<{ url: string; contentType: string; path: string; kind: MediaItem["kind"] }> = [];

      for (const m of items) {
        try {
          const blob = m.kind === "image" ? await exportImage(m) : m.file;
          const res = await uploadWithRetry(blob, {
            userId,
            bucket: "posts",
            onProgress: (p) => setProgress((prev) => ({ ...prev, [m.id]: p })),
          });
          uploaded.push({ ...res, kind: m.kind });
        } catch (e) {
          setFailed((f) => [...f, m.id]);
          throw e;
        }
      }

      const first = uploaded[0];
      const kind: "photo" | "video" | "telemetry" =
        first?.kind === "video" ? "video" : "photo";

      // AI safety scan on the first image (fail-open on gateway error).
      if (first && first.kind === "image") {
        try {
          const verdict = await moderate({ data: { url: first.url } });
          if (!verdict.safe) {
            const cats = verdict.categories?.join(", ") || "policy violation";
            throw new Error(
              `Image blocked by safety scan (${cats}). ${verdict.reason ?? "Please choose a different photo."}`,
            );
          }
        } catch (e) {
          // Only re-throw our own block; swallow network errors so a flaky
          // AI gateway never prevents a legitimate post.
          if (e instanceof Error && e.message.startsWith("Image blocked")) throw e;
        }
      }

      // Text safety scan on the caption (fail-open on gateway error).
      if (caption.trim().length >= 3) {
        try {
          const v = await moderateCaption({ data: { text: caption, surface: "post" } });
          if (!v.safe) {
            const cats = v.categories?.join(", ") || "policy violation";
            throw new Error(
              `Caption blocked by safety scan (${cats}). ${v.reason ?? "Please revise."}`,
            );
          }
        } catch (e) {
          if (e instanceof Error && e.message.startsWith("Caption blocked")) throw e;
        }
      }




      // If scheduled → keep as draft, don't publish yet.
      if (scheduleAt) {
        const draft = saveDraft({
          ...(savedDraftId ? { id: savedDraftId } : {}),
          caption,
          kind: kind === "video" ? "video" : "photo",
          media: uploaded.map((u) => ({ url: u.url, contentType: u.contentType, path: u.path })),
          scheduledFor: new Date(scheduleAt).getTime(),
        });
        setSavedDraftId(draft.id);
        return { scheduled: true };
      }

      const musicFooter = music ? `\n\n♪ ${music.title} — ${music.artist}` : "";
      const captionWithMusic = (caption.trim() + musicFooter).trim();

      // Post-as-story path: 24h ephemeral, no feed post.
      if (postAsStory && first) {
        await postStory({
          data: {
            media_url: first.url,
            thumbnail_url: first.url,
            kind: first.kind === "video" ? "video" : "photo",
            caption: caption.trim() || undefined,
          },
        });
        return { scheduled: false, story: true };
      }

      await post({
        data: {
          kind,
          caption: captionWithMusic || undefined,
          media_url: first?.url,
          thumbnail_url: first?.url,
          is_reel: kind === "video",
        },
      });
      return { scheduled: false, story: false };
    },
    onSuccess: (r) => {
      if (!r.scheduled) {
        if (r.story) {
          queryClient.invalidateQueries({ queryKey: ["stories", "active"] });
        } else {
          queryClient.invalidateQueries({ queryKey: ["feed"] });
          queryClient.invalidateQueries({ queryKey: ["profile"] });
        }
        onDone?.();
      }
    },
    onError: (err) => {
      // Offline / network failure → keep everything as a draft and tell the user.
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      const msg = err instanceof Error ? err.message : String(err);
      const isNetwork = offline || /network|fetch|failed to fetch|offline|timeout/i.test(msg);
      if (isNetwork) {
        try {
          const draft = saveDraft({
            ...(savedDraftId ? { id: savedDraftId } : {}),
            caption,
            kind: (items[0]?.kind === "video" ? "video" : "photo") as PostDraft["kind"],
            media: items.map((m) => ({ url: m.previewUrl, contentType: m.file.type })),
            scheduledFor: scheduleAt ? new Date(scheduleAt).getTime() : null,
          });
          setSavedDraftId(draft.id);
        } catch { /* ignore */ }
      }
    },
  });

  const draftSave = () => {
    const draft = saveDraft({
      ...(savedDraftId ? { id: savedDraftId } : {}),
      caption,
      kind: (items[0]?.kind === "video" ? "video" : "photo") as PostDraft["kind"],
      media: items.map((m) => ({ url: m.previewUrl, contentType: m.file.type })),
      scheduledFor: scheduleAt ? new Date(scheduleAt).getTime() : null,
    });
    setSavedDraftId(draft.id);
  };

  return (
    <div className="pb-40" style={{ background: "var(--color-obsidian, #0a0a0b)", minHeight: "100dvh" }}>
      {/* Hidden native pickers */}
      <input ref={pickGallery} type="file" accept="image/*,video/*" multiple hidden
        onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = ""; }} />
      <input ref={pickCamera} type="file" accept="image/*" capture="environment" hidden
        onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = ""; }} />
      <input ref={pickVideo} type="file" accept="video/*" capture="environment" hidden
        onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = ""; }} />

      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3"
        style={{ background: "rgba(10,10,11,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--color-hair)" }}>
        <button onClick={onDone} className="mono-tag tap px-2 py-1" style={{ color: "var(--color-titanium)" }}>← Close</button>
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>◆ STUDIO</p>
        <button onClick={() => setShowPreview(true)} className="mono-tag tap px-2 py-1" style={{ color: "var(--color-ink)" }}>Preview</button>
      </header>

      {/* Empty state → picker */}
      {!items.length && (
        <div className="px-5 pt-8">
          <h1 className="serif text-3xl italic" style={{ color: "var(--color-ink)" }}>Compose</h1>
          <p className="mono-tag mt-2" style={{ color: "var(--color-silver)" }}>Pick from your library or use the camera. Up to 10 items.</p>
          <div className="mt-6 grid grid-cols-1 gap-2">
            <PickerButton label="Photo & video library" onClick={() => pickGallery.current?.click()} accent />
            <PickerButton label="Take a photo" onClick={async () => {
              const { pickNativePhoto } = await import("@/lib/native/camera");
              const f = await pickNativePhoto("photo");
              if (f) {
                const dt = new DataTransfer(); dt.items.add(f); addFiles(dt.files);
              } else { pickCamera.current?.click(); }
            }} />
            <PickerButton label="Record a video" onClick={() => pickVideo.current?.click()} />

          </div>
          <div className="mt-8">
            <p className="mono-tag mb-2" style={{ color: "var(--color-silver)" }}>OR</p>
            <textarea
              value={caption} onChange={(e) => setCaption(e.target.value)}
              rows={4} placeholder="Say something…"
              className="w-full rounded-lg px-3 py-2 text-[13px]"
              style={{ background: "var(--color-graphite)", color: "var(--color-ink)", border: "1px solid var(--color-hair)" }}
            />
            <button
              onClick={() => publish.mutate()}
              disabled={!caption.trim() || publish.isPending}
              className="tap mt-3 w-full rounded-full py-3 text-[12px] font-bold uppercase tracking-wider"
              style={{ background: "var(--color-neon)", color: "var(--color-obsidian)", opacity: publish.isPending || !caption.trim() ? 0.5 : 1 }}
            >
              {publish.isPending ? "Publishing…" : "Publish text only"}
            </button>
            {publish.error && (
              <p className="mt-2 text-[12px]" style={{ color: "#ff8080" }}>
                {(publish.error as Error).message}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Editor */}
      {items.length > 0 && activeItem && (
        <>
          {/* Thumbnails / reorder */}
          <div className="flex items-center gap-2 overflow-x-auto px-3 py-3" style={{ borderBottom: "1px solid var(--color-hair)" }}>
            {items.map((m, i) => (
              <ThumbCell key={m.id} m={m} active={i === active} onClick={() => setActive(i)}
                onRemove={() => removeAt(i)}
                onLeft={() => move(i, i - 1)} onRight={() => move(i, i + 1)}
                progress={progress[m.id]} failed={failed.includes(m.id)} />
            ))}
            {items.length < 10 && (
              <button onClick={() => pickGallery.current?.click()}
                className="tap grid h-16 w-16 shrink-0 place-items-center"
                style={{ border: "1px dashed var(--color-hair-strong)", color: "var(--color-titanium)", borderRadius: 8 }}
              >+</button>
            )}
          </div>

          {/* Preview stage */}
          <div className="relative mx-3 mt-3 overflow-hidden" style={{ border: "1px solid var(--color-hair)", borderRadius: 8, background: "#000" }}>
            <PreviewStage m={activeItem} onEditOverlay={(id, patch) => patchActive({ overlays: activeItem.overlays.map((o) => o.id === id ? { ...o, ...patch } : o) })}
              onAddStrokePoint={tab === "draw" ? (p, stroke) => {
                if (stroke === "new") patchActive({ strokes: [...activeItem.strokes, { color: "#c6ff3d", size: 4, points: [p] }] });
                else {
                  const copy = [...activeItem.strokes];
                  copy[copy.length - 1] = { ...copy[copy.length - 1], points: [...copy[copy.length - 1].points, p] };
                  patchActive({ strokes: copy });
                }
              } : null}
            />
          </div>

          {/* Aspect & rotate (image only) */}
          {activeItem.kind === "image" && (
            <div className="mt-3 flex items-center gap-2 overflow-x-auto px-3">
              {ASPECTS.map((a) => (
                <ChipBtn key={a.id} active={activeItem.aspect === a.id} onClick={() => patchActive({ aspect: a.id })}>{a.label}</ChipBtn>
              ))}
              <button onClick={() => patchActive({ rotation: ((activeItem.rotation + 90) % 360) as MediaItem["rotation"] })}
                className="mono-tag tap px-3 py-1.5" style={{ color: "var(--color-ink)", border: "1px solid var(--color-hair-strong)", borderRadius: 999 }}>
                Rotate 90°
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="mt-4 flex px-3" style={{ borderBottom: "1px solid var(--color-hair)" }}>
            {(["filters", "adjust", "text", "draw", "music", ...(activeItem.kind === "video" ? ["video"] as const : [])] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className="tap flex-1 py-2 text-[11px] uppercase tracking-wider"
                style={{ color: tab === t ? "var(--color-neon)" : "var(--color-silver)", borderBottom: tab === t ? "2px solid var(--color-neon)" : "2px solid transparent" }}
              >{t}</button>
            ))}
          </div>

          <div className="px-3 pt-4">
            {tab === "filters" && (
              <div className="flex gap-2 overflow-x-auto">
                {FILTERS.map((f) => (
                  <button key={f.id} onClick={() => patchActive({ filter: f.id })}
                    className="tap shrink-0 text-center" style={{ opacity: activeItem.filter === f.id ? 1 : 0.75 }}>
                    <div className="h-16 w-16 overflow-hidden" style={{ border: activeItem.filter === f.id ? "2px solid var(--color-neon)" : "1px solid var(--color-hair-strong)", borderRadius: 6 }}>
                      {activeItem.kind === "image" ? (
                        <img src={activeItem.previewUrl} alt="" className="h-full w-full object-cover" style={{ filter: f.css }} />
                      ) : <div className="h-full w-full bg-[var(--color-graphite)]" />}
                    </div>
                    <p className="mono-tag mt-1" style={{ color: "var(--color-silver)", fontSize: 9 }}>{f.label}</p>
                  </button>
                ))}
              </div>
            )}

            {tab === "adjust" && (
              <div className="space-y-3">
                <Slider label="Brightness" value={activeItem.adjust.brightness} min={0.4} max={1.6} step={0.02}
                  onChange={(v) => patchAdjust({ brightness: v })} onReset={() => patchAdjust({ brightness: 1 })} />
                <Slider label="Contrast" value={activeItem.adjust.contrast} min={0.5} max={1.7} step={0.02}
                  onChange={(v) => patchAdjust({ contrast: v })} onReset={() => patchAdjust({ contrast: 1 })} />
                <Slider label="Saturation" value={activeItem.adjust.saturation} min={0} max={2} step={0.02}
                  onChange={(v) => patchAdjust({ saturation: v })} onReset={() => patchAdjust({ saturation: 1 })} />
                <Slider label="Exposure" value={activeItem.adjust.exposure} min={-0.4} max={0.4} step={0.02}
                  onChange={(v) => patchAdjust({ exposure: v })} onReset={() => patchAdjust({ exposure: 0 })} />
                <Slider label="Highlights" value={activeItem.adjust.highlights} min={-0.5} max={0.5} step={0.02}
                  onChange={(v) => patchAdjust({ highlights: v })} onReset={() => patchAdjust({ highlights: 0 })} />
                <Slider label="Shadows" value={activeItem.adjust.shadows} min={-0.5} max={0.5} step={0.02}
                  onChange={(v) => patchAdjust({ shadows: v })} onReset={() => patchAdjust({ shadows: 0 })} />
              </div>
            )}

            {tab === "text" && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {["#ffffff", "#c6ff3d", "#ff5a5a", "#ffb800", "#4fc3ff", "#000000"].map((c) => (
                    <button key={c} onClick={() => {
                      const id = `t_${Date.now()}`;
                      patchActive({ overlays: [...activeItem.overlays, { id, text: "Type here", x: 0.15, y: 0.4, size: 32, color: c }] });
                    }} className="h-7 w-7 rounded-full" style={{ background: c, border: "1px solid rgba(255,255,255,0.2)" }} />
                  ))}
                  <span className="mono-tag ml-2 self-center" style={{ color: "var(--color-silver)" }}>tap a color to add text</span>
                </div>
                {activeItem.overlays.map((o) => (
                  <div key={o.id} className="flex items-center gap-2">
                    <input value={o.text} onChange={(e) => patchActive({ overlays: activeItem.overlays.map((x) => x.id === o.id ? { ...x, text: e.target.value } : x) })}
                      className="flex-1 rounded px-2 py-1 text-[12px]" style={{ background: "var(--color-graphite)", color: "var(--color-ink)", border: "1px solid var(--color-hair)" }} />
                    <input type="range" min={12} max={80} value={o.size}
                      onChange={(e) => patchActive({ overlays: activeItem.overlays.map((x) => x.id === o.id ? { ...x, size: Number(e.target.value) } : x) })} />
                    <button onClick={() => patchActive({ overlays: activeItem.overlays.filter((x) => x.id !== o.id) })}
                      className="mono-tag" style={{ color: "#ff8080" }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {tab === "draw" && (
              <div className="mono-tag" style={{ color: "var(--color-silver)" }}>
                Draw on the image above with your finger.
                <button onClick={() => patchActive({ strokes: [] })} className="ml-3 underline">Clear</button>
              </div>
            )}

            {tab === "music" && (
              <div className="space-y-3">
                {music ? (
                  <div
                    className="flex items-center gap-3 rounded-lg p-2"
                    style={{ background: "var(--color-graphite)", border: "1px solid var(--color-neon)" }}
                  >
                    <div
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-md"
                      style={{ background: "var(--color-neon)", color: "var(--color-obsidian)" }}
                    >
                      ♪
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold" style={{ color: "var(--color-ink)" }}>
                        {music.title}
                      </p>
                      <p className="mono-tag truncate" style={{ color: "var(--color-silver)" }}>
                        {music.artist} · starts at {formatDuration(music.startAt)} · vol {Math.round(music.volume * 100)}%
                      </p>
                    </div>
                    <button
                      onClick={() => setShowMusic(true)}
                      className="mono-tag tap px-2 py-1 rounded-full"
                      style={{ color: "var(--color-ink)", border: "1px solid var(--color-hair-strong)" }}
                    >
                      Change
                    </button>
                    <button
                      onClick={() => setMusic(null)}
                      className="mono-tag tap px-2 py-1"
                      style={{ color: "#ff8080" }}
                      aria-label="Remove music"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowMusic(true)}
                    className="tap w-full rounded-lg px-4 py-4 text-left text-[13px]"
                    style={{
                      background: "var(--color-graphite)",
                      color: "var(--color-ink)",
                      border: "1px dashed var(--color-hair-strong)",
                    }}
                  >
                    <span className="mono-tag" style={{ color: "var(--color-neon)" }}>♪ ADD MUSIC</span>
                    <p className="mt-1 text-[12px]" style={{ color: "var(--color-silver)" }}>
                      Browse hype, drift, night-ride and cinematic tracks. Preview, trim the start, set volume.
                    </p>
                  </button>
                )}
              </div>
            )}

            {tab === "video" && activeItem.kind === "video" && (
              <VideoControls m={activeItem} onPatch={patchActive} />
            )}
          </div>

          {/* Caption + publish bar */}
          <div className="mt-6 px-3">
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)}
              rows={3} maxLength={2200} placeholder="Write a caption…"
              className="w-full rounded-lg px-3 py-2 text-[13px]"
              style={{ background: "var(--color-graphite)", color: "var(--color-ink)", border: "1px solid var(--color-hair)" }} />

            <div className="mt-3 flex items-center justify-between gap-2">
              <label className="mono-tag flex items-center gap-2" style={{ color: "var(--color-silver)" }}>
                Schedule
                <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)}
                  disabled={postAsStory}
                  className="rounded px-2 py-1 text-[11px]" style={{ background: "var(--color-graphite)", color: "var(--color-ink)", border: "1px solid var(--color-hair)", opacity: postAsStory ? 0.4 : 1 }} />
              </label>
              <button onClick={draftSave} className="mono-tag tap px-3 py-1.5" style={{ color: "var(--color-ink)", border: "1px solid var(--color-hair-strong)", borderRadius: 999 }}>
                {savedDraftId ? "Draft saved ✓" : "Save draft"}
              </button>
            </div>

            <label
              className="mono-tag mt-3 flex items-center justify-between gap-2 rounded-lg px-3 py-2 tap"
              style={{
                background: postAsStory ? "rgba(198,255,61,0.08)" : "var(--color-graphite)",
                border: `1px solid ${postAsStory ? "var(--color-neon)" : "var(--color-hair)"}`,
                color: "var(--color-ink)",
              }}
            >
              <span className="flex flex-col">
                <span style={{ color: postAsStory ? "var(--color-neon)" : "var(--color-ink)" }}>
                  ◆ POST AS STORY · 24H
                </span>
                <span className="mono-tag" style={{ color: "var(--color-silver)", textTransform: "none", fontSize: 10 }}>
                  Ephemeral. Appears in the Stories rail, not the feed. Disables scheduling.
                </span>
              </span>
              <input
                type="checkbox"
                checked={postAsStory}
                onChange={(e) => { setPostAsStory(e.target.checked); if (e.target.checked) setScheduleAt(""); }}
                className="h-4 w-4 accent-[var(--color-neon)]"
              />
            </label>

            {publish.error && <p className="mt-2 text-[12px]" style={{ color: "#ff8080" }}>{(publish.error as Error).message}</p>}

            <button onClick={() => publish.mutate()} disabled={publish.isPending || (postAsStory && !items.length)}
              className="tap mt-3 w-full rounded-full py-3 text-[12px] font-bold uppercase tracking-wider"
              style={{ background: "var(--color-neon)", color: "var(--color-obsidian)", letterSpacing: "0.14em", opacity: publish.isPending ? 0.5 : 1 }}
            >
              {publish.isPending ? "Uploading…" : postAsStory ? "Share to Story" : scheduleAt ? "Save & schedule" : "Publish"}
            </button>
          </div>
        </>
      )}

      {/* Preview modal */}
      {showPreview && activeItem && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: "rgba(0,0,0,0.9)" }} onClick={() => setShowPreview(false)}>
          <div className="max-h-full max-w-full overflow-hidden" style={{ border: "1px solid var(--color-hair-strong)" }}>
            <PreviewStage m={activeItem} onEditOverlay={() => {}} onAddStrokePoint={null} />
          </div>
        </div>
      )}

      <MusicLibrary
        open={showMusic}
        initial={music}
        onClose={() => setShowMusic(false)}
        onConfirm={(t) => { setMusic(t); setShowMusic(false); }}
      />
    </div>
  );
}

/* ---------- sub components ---------- */

function PickerButton({ label, onClick, accent }: { label: string; onClick: () => void; accent?: boolean }) {
  return (
    <button onClick={onClick} className="tap w-full rounded-lg px-4 py-4 text-left text-[13px]"
      style={{
        background: accent ? "var(--color-neon)" : "var(--color-graphite)",
        color: accent ? "var(--color-obsidian)" : "var(--color-ink)",
        border: "1px solid var(--color-hair-strong)",
      }}>
      {label}
    </button>
  );
}

function ChipBtn({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="mono-tag tap px-3 py-1.5"
      style={{
        color: active ? "var(--color-obsidian)" : "var(--color-ink)",
        background: active ? "var(--color-neon)" : "transparent",
        border: "1px solid var(--color-hair-strong)", borderRadius: 999,
      }}>{children}</button>
  );
}

function ThumbCell({ m, active, onClick, onRemove, onLeft, onRight, progress, failed }: {
  m: MediaItem; active: boolean; onClick: () => void; onRemove: () => void; onLeft: () => void; onRight: () => void;
  progress?: UploadProgress; failed: boolean;
}) {
  return (
    <div className="relative shrink-0">
      <button onClick={onClick} className="tap block h-16 w-16 overflow-hidden"
        style={{ border: active ? "2px solid var(--color-neon)" : "1px solid var(--color-hair-strong)", borderRadius: 8 }}>
        {m.kind === "image" ? (
          <img src={m.previewUrl} alt="" className="h-full w-full object-cover" style={{ filter: filterCss(m) }} />
        ) : (
          <video src={m.previewUrl} className="h-full w-full object-cover" muted playsInline />
        )}
      </button>
      {progress && (
        <div className="absolute inset-x-0 bottom-0 h-1" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="h-full" style={{ width: `${Math.round(progress.pct * 100)}%`, background: "var(--color-neon)" }} />
        </div>
      )}
      {failed && <p className="mono-tag absolute inset-x-0 top-0 text-center" style={{ color: "#ff8080", fontSize: 8 }}>failed</p>}
      <div className="absolute -top-1.5 -right-1.5 flex gap-0.5">
        <button onClick={onLeft} title="Move left" className="mono-tag h-4 w-4 rounded-full text-[8px]" style={{ background: "var(--color-graphite)", color: "var(--color-ink)", border: "1px solid var(--color-hair-strong)" }}>‹</button>
        <button onClick={onRight} title="Move right" className="mono-tag h-4 w-4 rounded-full text-[8px]" style={{ background: "var(--color-graphite)", color: "var(--color-ink)", border: "1px solid var(--color-hair-strong)" }}>›</button>
        <button onClick={onRemove} title="Remove" className="mono-tag h-4 w-4 rounded-full text-[8px]" style={{ background: "#ff5a5a", color: "#fff" }}>✕</button>
      </div>
    </div>
  );
}

function PreviewStage({ m, onEditOverlay, onAddStrokePoint }: {
  m: MediaItem;
  onEditOverlay: (id: string, patch: Partial<Overlay>) => void;
  onAddStrokePoint: null | ((p: { x: number; y: number }, stroke: "new" | "cont") => void);
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const aspect = ASPECTS.find((a) => a.id === m.aspect)?.ratio ?? null;
  const style: React.CSSProperties = aspect ? { aspectRatio: String(aspect) } : { aspectRatio: "1 / 1" };

  const toRel = (clientX: number, clientY: number) => {
    const r = wrap.current!.getBoundingClientRect();
    return { x: (clientX - r.left) / r.width, y: (clientY - r.top) / r.height };
  };

  const startDrawing = (e: React.PointerEvent) => {
    if (!onAddStrokePoint) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drawing.current = true;
    onAddStrokePoint(toRel(e.clientX, e.clientY), "new");
  };
  const moveDrawing = (e: React.PointerEvent) => {
    if (!drawing.current || !onAddStrokePoint) return;
    onAddStrokePoint(toRel(e.clientX, e.clientY), "cont");
  };
  const endDrawing = () => { drawing.current = false; };

  return (
    <div ref={wrap} className="relative w-full select-none" style={{ ...style, touchAction: onAddStrokePoint ? "none" : undefined }}
      onPointerDown={startDrawing} onPointerMove={moveDrawing} onPointerUp={endDrawing} onPointerCancel={endDrawing}>
      {m.kind === "image" ? (
        <img src={m.previewUrl} alt="" className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: filterCss(m), transform: `rotate(${m.rotation}deg)` }} draggable={false} />
      ) : (
        <video src={m.previewUrl} className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: filterCss(m) }}
          controls muted={m.muted} playsInline
          onLoadedMetadata={(e) => { (e.currentTarget as HTMLVideoElement).playbackRate = m.speed ?? 1; }} />
      )}
      {/* strokes */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {m.strokes.map((s, i) => (
          <polyline key={i} points={s.points.map((p) => `${p.x * 100},${p.y * 100}`).join(" ")}
            stroke={s.color} strokeWidth={s.size * 0.3} fill="none" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
      {/* overlays */}
      {m.overlays.map((o) => (
        <DraggableOverlay key={o.id} o={o} onChange={(patch) => onEditOverlay(o.id, patch)} bounds={wrap} />
      ))}
    </div>
  );
}

function DraggableOverlay({ o, onChange, bounds }: { o: Overlay; onChange: (p: Partial<Overlay>) => void; bounds: React.RefObject<HTMLDivElement | null> }) {
  const state = useRef<{ dx: number; dy: number } | null>(null);
  return (
    <div
      onPointerDown={(e) => {
        (e.target as Element).setPointerCapture?.(e.pointerId);
        const r = bounds.current!.getBoundingClientRect();
        state.current = { dx: e.clientX - (r.left + o.x * r.width), dy: e.clientY - (r.top + o.y * r.height) };
      }}
      onPointerMove={(e) => {
        if (!state.current) return;
        const r = bounds.current!.getBoundingClientRect();
        const x = (e.clientX - state.current.dx - r.left) / r.width;
        const y = (e.clientY - state.current.dy - r.top) / r.height;
        onChange({ x: Math.max(0, Math.min(0.95, x)), y: Math.max(0, Math.min(0.95, y)) });
      }}
      onPointerUp={() => { state.current = null; }}
      className="absolute cursor-move select-none touch-none"
      style={{
        left: `${o.x * 100}%`, top: `${o.y * 100}%`,
        color: o.color, fontSize: o.size, fontWeight: 700,
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
        textShadow: "0 2px 6px rgba(0,0,0,0.55)",
        letterSpacing: "0.01em",
      }}
    >{o.text}</div>
  );
}

function Slider({ label, value, min, max, step, onChange, onReset }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; onReset: () => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="mono-tag" style={{ color: "var(--color-silver)" }}>{label}</span>
        <button onClick={onReset} className="mono-tag" style={{ color: "var(--color-titanium)" }}>reset · {value.toFixed(2)}</button>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--color-neon)]" />
    </div>
  );
}

function VideoControls({ m, onPatch }: { m: MediaItem; onPatch: (p: Partial<MediaItem>) => void }) {
  const vidRef = useRef<HTMLVideoElement>(null);
  const [dur, setDur] = useState(0);
  const trimStart = m.trimStart ?? 0;
  const trimEnd = m.trimEnd ?? dur;
  return (
    <div className="space-y-3">
      <video ref={vidRef} src={m.previewUrl} className="w-full rounded"
        onLoadedMetadata={(e) => setDur((e.currentTarget as HTMLVideoElement).duration || 0)}
        controls muted={m.muted} playsInline />
      {dur > 0 && (
        <>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="mono-tag" style={{ color: "var(--color-silver)" }}>Trim start</span>
              <span className="mono-tag" style={{ color: "var(--color-titanium)" }}>{trimStart.toFixed(1)}s</span>
            </div>
            <input type="range" min={0} max={dur} step={0.1} value={trimStart}
              onChange={(e) => onPatch({ trimStart: Math.min(Number(e.target.value), trimEnd - 0.1) })}
              className="w-full accent-[var(--color-neon)]" />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="mono-tag" style={{ color: "var(--color-silver)" }}>Trim end</span>
              <span className="mono-tag" style={{ color: "var(--color-titanium)" }}>{trimEnd.toFixed(1)}s</span>
            </div>
            <input type="range" min={0} max={dur} step={0.1} value={trimEnd}
              onChange={(e) => onPatch({ trimEnd: Math.max(Number(e.target.value), trimStart + 0.1) })}
              className="w-full accent-[var(--color-neon)]" />
          </div>
        </>
      )}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="mono-tag" style={{ color: "var(--color-silver)" }}>Playback speed</span>
          <span className="mono-tag" style={{ color: "var(--color-titanium)" }}>{(m.speed ?? 1).toFixed(2)}×</span>
        </div>
        <input type="range" min={0.25} max={2} step={0.05} value={m.speed ?? 1}
          onChange={(e) => onPatch({ speed: Number(e.target.value) })} className="w-full accent-[var(--color-neon)]" />
      </div>
      <label className="mono-tag flex items-center gap-2" style={{ color: "var(--color-ink)" }}>
        <input type="checkbox" checked={!!m.muted} onChange={(e) => onPatch({ muted: e.target.checked })} />
        Mute audio
      </label>
      <p className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 10 }}>
        Advanced video encoding (merging clips, voice-over, music mix) runs during server-side rendering after upload.
      </p>
    </div>
  );
}
