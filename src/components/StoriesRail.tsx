import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import type { Story } from "@/lib/types";
import { listActiveStories } from "@/lib/stories.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  Radio,
  Route,
  BarChart3,
  MessageCircleQuestion,
  CalendarDays,
  Play,
  Image as ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { ComponentType } from "react";

const KIND_ICON: Record<Story["kind"], ComponentType<{ className?: string }>> = {
  photo: ImageIcon,
  video: Play,
  poll: BarChart3,
  question: MessageCircleQuestion,
  ride: Route,
  event: CalendarDays,
};

const SEEN_KEY = "zrex.stories.seen.v1";
const STORY_DURATION = 5000;

function loadSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}
function persistSeen(set: Set<string>) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

// Local "me" tile the composer opens.
const ME_TILE: Story = {
  id: "__me__",
  user: { id: "me", handle: "@you", name: "You", avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=me", verified: false, location: "" },
  kind: "photo",
  cover: "https://api.dicebear.com/7.x/shapes/svg?seed=me",
};

export function StoriesRail() {
  const navigate = useNavigate();
  const [seen, setSeen] = useState<Set<string>>(() => loadSeen());
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => { if (alive) setSignedIn(!!data.user); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s?.user));
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  const fetchStories = useServerFn(listActiveStories);
  const live = useQuery({
    queryKey: ["stories", "active"],
    queryFn: () => fetchStories(),
    staleTime: 60_000,
  });

  const stories = useMemo<Story[]>(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (live.data?.items ?? []) as any[];
    const realMapped: Story[] = rows
      .filter((r) => r.media_url || r.thumbnail_url)
      .map((r) => {
        const a = r.author ?? {};
        return {
          id: r.id,
          user: {
            id: (a.id ?? r.author_id) as string,
            handle: a.handle ? `@${String(a.handle).replace(/^@/, "")}` : "@rider",
            name: a.display_name || a.handle || "Rider",
            avatar: a.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${a.id ?? r.author_id}`,
            verified: !!a.is_verified,
            location: "",
          },
          kind: (r.kind as Story["kind"]) ?? "photo",
          cover: r.thumbnail_url || r.media_url,
          mediaUrl: r.media_url ?? undefined,
          label: r.label ?? undefined,
        } as Story;
      });

    return [ME_TILE, ...realMapped].map((s, i) => ({
      ...s,
      seen: i === 0 ? false : s.seen || seen.has(s.id),
    }));
  }, [live.data, seen, signedIn]);


  function openStory(i: number) {
    if (i === 0) {
      navigate({ to: "/post/new" });
      return;
    }
    setViewerIndex(i);
  }

  function markSeen(id: string) {
    setSeen((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      persistSeen(next);
      return next;
    });
  }

  return (
    <>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 py-3">
        {stories.map((s, i) => {
          const isMe = i === 0;
          const ringClass = s.live
            ? "story-ring-live"
            : s.seen
            ? "story-ring-seen"
            : "story-ring";
          return (
            <button
              key={s.id}
              onClick={() => openStory(i)}
              className="tap group flex w-[74px] flex-col items-center gap-1.5"
              aria-label={isMe ? "Add to your story" : `Open story from ${s.user.name}`}
            >
              <div className="relative">
                <div className={ringClass}>
                  <div className="rounded-full bg-bone p-[3px]">
                    <div className="relative h-[62px] w-[62px] overflow-hidden rounded-full">
                      <img src={s.cover} alt="" className="h-full w-full object-cover" />
                    </div>
                  </div>
                </div>

                {isMe ? (
                  <span className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full border-2 border-bone bg-ink text-bone">
                    <Plus className="h-3.5 w-3.5" />
                  </span>
                ) : s.live ? (
                  <span
                    className="mono-caps absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full px-1.5 py-0.5 text-[8px] font-bold text-ink"
                    style={{ background: "var(--color-neon, #00c853)" }}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Radio className="h-2.5 w-2.5" /> LIVE
                    </span>
                  </span>
                ) : (
                  <StoryKindBadge kind={s.kind} />
                )}
              </div>
              <span className="line-clamp-1 max-w-[74px] text-[11px] font-medium text-ink/80">
                {isMe ? "You" : s.user.name.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>

      {viewerIndex != null && (
        <StoryViewer
          stories={stories}
          startIndex={viewerIndex}
          onSeen={markSeen}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </>
  );
}

function StoryKindBadge({ kind }: { kind: Story["kind"] }) {
  const Icon = KIND_ICON[kind];
  const tone =
    kind === "video"
      ? "bg-ink text-bone"
      : kind === "ride"
      ? "text-bone"
      : kind === "event"
      ? "text-ink"
      : kind === "poll"
      ? "text-ink"
      : "text-ink";
  const styleOverride =
    kind === "ride"
      ? { background: "var(--color-cool)" }
      : kind === "event"
      ? { background: "var(--color-signal)" }
      : kind === "poll"
      ? { background: "var(--color-signal)" }
      : kind === "question"
      ? { background: "var(--color-plum)", color: "white" }
      : undefined;
  return (
    <span
      className={`absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full border-2 border-bone ${tone}`}
      style={styleOverride}
    >
      <Icon className="h-2.5 w-2.5" />
    </span>
  );
}

function StoryViewer({
  stories,
  startIndex,
  onSeen,
  onClose,
}: {
  stories: Story[];
  startIndex: number;
  onSeen: (id: string) => void;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const pausedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(performance.now());
  const elapsedRef = useRef<number>(0);

  const current = stories[index];

  useEffect(() => {
    onSeen(current.id);
    startedAtRef.current = performance.now();
    elapsedRef.current = 0;
    setProgress(0);

    const tick = (now: number) => {
      if (!pausedRef.current) {
        const total = elapsedRef.current + (now - startedAtRef.current);
        const p = Math.min(1, total / STORY_DURATION);
        setProgress(p);
        if (p >= 1) {
          next();
          return;
        }
      } else {
        startedAtRef.current = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function next() {
    if (index >= stories.length - 1) {
      onClose();
      return;
    }
    setIndex((i) => i + 1);
  }
  function prev() {
    setIndex((i) => Math.max(0, i - 1));
  }

  function pause() {
    if (pausedRef.current) return;
    pausedRef.current = true;
    elapsedRef.current += performance.now() - startedAtRef.current;
  }
  function resume() {
    if (!pausedRef.current) return;
    pausedRef.current = false;
    startedAtRef.current = performance.now();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
      role="dialog"
      aria-modal="true"
      onMouseDown={pause}
      onMouseUp={resume}
      onTouchStart={pause}
      onTouchEnd={resume}
    >
      {/* progress bars */}
      <div className="absolute inset-x-3 top-3 z-10 flex gap-1">
        {stories.map((_, i) => (
          <div key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full"
              style={{
                width: `${i < index ? 100 : i === index ? progress * 100 : 0}%`,
                background: "var(--color-neon, #00c853)",
                boxShadow: i === index ? "0 0 6px rgba(0,200,83,0.7)" : "none",
              }}
            />
          </div>
        ))}
      </div>

      {/* header */}
      <div className="absolute inset-x-3 top-8 z-10 flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 overflow-hidden rounded-full ring-1 ring-white/40">
            <img src={current.user.avatar} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="text-[13px] font-semibold leading-tight">
            {current.user.name}
            {current.label && (
              <div className="mono-caps text-[10px] font-medium opacity-80">{current.label}</div>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close story"
          className="tap grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white backdrop-blur"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* media — detect video by kind OR file extension so mis-tagged uploads still play */}
      {(current.kind === "video" || /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(current.mediaUrl ?? current.cover ?? "")) ? (
        <video
          key={current.id}
          src={current.mediaUrl ?? current.cover}
          poster={current.cover !== current.mediaUrl ? current.cover : undefined}
          autoPlay
          playsInline
          muted
          controls={false}
          onLoadedMetadata={(e) => { (e.currentTarget as HTMLVideoElement).play().catch(() => {}); }}
          className="max-h-[100svh] w-full object-contain"
        />
      ) : (
        <img
          key={current.id}
          src={current.cover}
          alt={current.label ?? ""}
          className="max-h-[100svh] w-full object-contain"
          draggable={false}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.15"; }}
        />
      )}

      {/* prev / next tap zones */}
      <button
        aria-label="Previous story"
        onClick={(e) => { e.stopPropagation(); prev(); }}
        className="absolute inset-y-0 left-0 z-20 w-1/3"
      />
      <button
        aria-label="Next story"
        onClick={(e) => { e.stopPropagation(); next(); }}
        className="absolute inset-y-0 right-0 z-20 w-1/3"
      />

      {/* explicit arrows for desktop */}
      <button
        aria-label="Previous story"
        onClick={(e) => { e.stopPropagation(); prev(); }}
        className="tap absolute left-2 top-1/2 z-30 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white sm:block"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        aria-label="Next story"
        onClick={(e) => { e.stopPropagation(); next(); }}
        className="tap absolute right-2 top-1/2 z-30 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white sm:block"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
