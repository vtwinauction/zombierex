import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
type Reel = {
  id: string;
  user: { id: string; handle: string; avatar: string; verified?: boolean; name?: string; location?: string };
  vehicle?: { name: string; year?: number };
  video?: string;
  poster: string;
  caption: string;
  hashtags: string[];
  location?: string;
  music: { title: string; artist: string };
  likes: number;
  comments: number;
  shares: number;
  saves?: number;
  views: number | string;
  followed?: boolean;
  duration: number;
  taggedProduct?: { name: string; price: string };
};
import { RiderMark } from "@/components/RiderBadge";
import { IconClaw, IconVisor, IconMechClaw, IconBoneMark } from "@/components/icons/RexIcons";
import { ReportBlockSheet } from "@/components/ReportBlockSheet";
import { MoreVertical } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listFeed, listAuthedFeed } from "@/lib/feed.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reels")({
  head: () => ({
    meta: [
      { title: "Reels · ZOMBIEREX" },
      { name: "description", content: "Full-screen vertical rides, builds and burnouts from the ZOMBIEREX network." },
      { property: "og:title", content: "Reels · ZOMBIEREX" },
      { property: "og:description", content: "Full-screen vertical rides, builds and burnouts from the ZOMBIEREX network." },
      { property: "og:type", content: "video.other" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReelsPage,
});



function ReelsPage() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const fetchFeed = useServerFn(listFeed);
  const fetchAuthedFeed = useServerFn(listAuthedFeed);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => { if (alive) setSignedIn(!!data.user); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s?.user));
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);
  const live = useQuery({
    queryKey: ["reels", "live", signedIn ? "authed" : "anon"],
    queryFn: () => (signedIn
      ? fetchAuthedFeed({ data: { kind: "video", limit: 24 } })
      : fetchFeed({ data: { kind: "video", limit: 24 } })),
    staleTime: 60_000,
  });

  const feed: Reel[] = useMemo(() => {
    const items = (live.data?.items ?? []) as any[];
    const mapped: Reel[] = items
      .filter((r) => r.media_url || r.thumbnail_url)
      .map((r) => {
        const a = r.author ?? {};
        return {
          id: `db:${r.id}`,
          user: {
            id: (a.id ?? r.author_id) as string,
            handle: a.handle ? `@${String(a.handle).replace(/^@/, "")}` : "@rider",
            name: a.display_name || a.handle || "Rider",
            avatar: a.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${a.id ?? r.author_id}`,
            verified: !!a.is_verified,
            location: a.location || "",
          },
          video: r.media_url || "",
          poster: r.thumbnail_url || r.media_url || "",
          duration: 15,
          caption: r.caption ?? "",
          hashtags: [],
          location: a.location || "",
          music: { title: "Original sound", artist: a.display_name || a.handle || "rider" },
          likes: r.likes_count ?? 0,
          comments: r.comments_count ?? 0,
          shares: r.shares_count ?? 0,
          saves: 0,
          views: r.views_count ?? 0,
        } as Reel;
      });
    return mapped;
  }, [live.data]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const items = Array.from(scroller.querySelectorAll<HTMLElement>("[data-reel-idx]"));
    const io = new IntersectionObserver(
      (entries) => {
        let best: { idx: number; ratio: number } | null = null;
        for (const e of entries) {
          const idx = Number((e.target as HTMLElement).dataset.reelIdx);
          if (!best || e.intersectionRatio > best.ratio) best = { idx, ratio: e.intersectionRatio };
        }
        if (best && best.ratio > 0.6) setActiveIdx(best.idx);
      },
      { root: scroller, threshold: [0, 0.6, 0.95] },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Prefetch next 2 posters for instant snap
  useEffect(() => {
    for (let k = 1; k <= 2; k++) {
      const next = feed[activeIdx + k];
      if (!next) break;
      const img = new Image();
      img.decoding = "async";
      img.src = next.poster;
    }
  }, [activeIdx]);


  return (
    <div
      className="on-dark fixed inset-0 z-40"
      style={{ background: "var(--color-obsidian)" }}
    >
      {/* Top overlay: tabs + back */}
      <header
        className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),14px)] pb-3"
        style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.55), transparent)" }}
      >
        <Link
          to="/"
          className="pointer-events-auto tap grid h-9 w-9 place-items-center rounded-full text-white"
          aria-label="Back"
          style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.18)", backdropFilter: "blur(10px)" }}
        >
          ‹
        </Link>
        <div className="pointer-events-auto flex items-center gap-5 text-white">
          <button className="text-[15px] font-semibold" style={{ opacity: 0.55 }}>Following</button>
          <span style={{ height: 4, width: 4, borderRadius: 999, background: "var(--color-neon)" }} />
          <button className="text-[15px] font-bold">For you</button>
        </div>
        <div style={{ width: 36 }} />
      </header>

      {/* Snap scroller */}
      <div
        ref={scrollerRef}
        className="no-scrollbar h-full w-full overflow-y-auto"
        style={{ scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch" }}
      >
        {feed.map((r, i) => (
          <ReelSlide key={`${r.id}-${i}`} reel={r} idx={i} active={activeIdx === i} />
        ))}
      </div>
    </div>
  );
}

function ReelSlide({ reel, idx, active }: { reel: Reel; idx: number; active: boolean }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [followed, setFollowed] = useState(reel.followed);
  const [muted, setMuted] = useState(true);
  const [lastTap, setLastTap] = useState(0);
  const [heartPing, setHeartPing] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [localComments, setLocalComments] = useState<{ handle: string; text: string; avatar: string }[]>([
    { handle: "@nitro_rider", text: "That widebody stance is unreal 🔥", avatar: reel.user.avatar },
    { handle: "@apex_kai", text: "Berlin meet — I'm in.", avatar: reel.user.avatar },
    { handle: "@turbo_lila", text: "Wheels spec?", avatar: reel.user.avatar },
  ]);
  const [reportOpen, setReportOpen] = useState(false);


  function onTap() {
    if (commentsOpen) return;
    const now = Date.now();
    if (now - lastTap < 260) {
      if (!liked) setLiked(true);
      setHeartPing(true);
      setTimeout(() => setHeartPing(false), 620);
    } else {
      setMuted((m) => !m);
    }
    setLastTap(now);
  }

  async function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    const url = typeof window !== "undefined" ? `${window.location.origin}/reels#${reel.id}` : "";
    const { share } = await import("@/lib/native");
    const res = await share({
      title: `${reel.user.handle} on ZOMBIEREX`,
      text: reel.caption,
      url,
      dialogTitle: "Share reel",
    });
    if (res.ok) toast.success("Shared");
  }

  function submitComment(e: React.FormEvent) {
    e.preventDefault();
    const t = commentDraft.trim();
    if (!t) return;
    setLocalComments((prev) => [{ handle: "@you", text: t, avatar: reel.user.avatar }, ...prev]);
    setCommentDraft("");
    toast.success("Comment posted");
  }

  return (
    <section
      data-reel-idx={idx}
      className="relative h-[100dvh] w-full overflow-hidden"
      style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
      onClick={onTap}
    >
      <img
        src={reel.poster}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ animation: active ? "ken-burns 18s ease-in-out infinite alternate" : "none" }}
      />
      <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 25%, transparent 55%, rgba(0,0,0,0.9) 100%)" }} />

      <span
        className="absolute right-3 top-[calc(env(safe-area-inset-top)+58px)] rounded-full px-2 py-1 text-[10px] font-semibold tracking-wider text-white"
        style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", fontFamily: "var(--font-mono)" }}
      >
        {muted ? "MUTED · TAP" : "SOUND ON"}
      </span>

      <button
        onClick={(e) => { e.stopPropagation(); setReportOpen(true); }}
        aria-label="More options"
        className="tap absolute right-3 grid h-9 w-9 place-items-center rounded-full text-white"
        style={{
          top: "calc(env(safe-area-inset-top) + 92px)",
          background: "rgba(0,0,0,0.5)",
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        <MoreVertical size={16} />
      </button>


      {heartPing && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div
            style={{
              color: "var(--color-ember)",
              filter: "drop-shadow(0 6px 24px rgba(255,91,58,0.6))",
              animation: "heart-ping 620ms ease-out forwards",
            }}
          >
            <IconClaw size={130} />
          </div>
        </div>
      )}

      {/* Right action rail — lifted above safe area */}
      <div
        className="absolute right-3 flex flex-col items-center gap-5 text-white"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 128px)" }}
      >
        <RailBtn
          Icon={IconClaw}
          count={fmt(reel.likes + (liked ? 1 : 0))}
          active={liked}
          tint="var(--color-neon)"
          onClick={(e) => { e.stopPropagation(); setLiked((v) => !v); }}
        />
        <RailBtn
          Icon={IconVisor}
          count={fmt(reel.comments + (localComments.length - 3))}
          onClick={(e) => { e.stopPropagation(); setCommentsOpen(true); }}
        />
        <RailBtn
          Icon={IconBoneMark}
          count={saved ? "Saved" : "Save"}
          active={saved}
          tint="var(--color-neon)"
          onClick={(e) => {
            e.stopPropagation();
            setSaved((v) => {
              toast.success(v ? "Removed from saved" : "Saved to garage");
              return !v;
            });
          }}
        />
        <RailBtn Icon={IconMechClaw} count={fmt(reel.shares)} onClick={handleShare} />
        <button
          onClick={(e) => e.stopPropagation()}
          className="tap mt-1 h-10 w-10 overflow-hidden rounded-full border-2"
          style={{ borderColor: "var(--color-neon)", animation: active ? "spin 12s linear infinite" : "none" }}
          aria-label="Sound"
        >
          <img src={reel.user.avatar} alt="" className="h-full w-full object-cover" />
        </button>
      </div>

      {/* Bottom content — lifted so nothing is clipped */}
      <div
        className="absolute inset-x-3 pr-16 text-white"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 34px)" }}
      >
        <div className="flex items-center gap-2">
          <img src={reel.user.avatar} alt="" className="h-9 w-9 rounded-full object-cover" style={{ boxShadow: "0 0 0 1.5px var(--color-neon)" }} />
          <p className="flex items-center gap-1.5 text-[14px] font-semibold">
            {reel.user.handle}
            {reel.user.verified && <RiderMark tier={idx % 2 === 0 ? "APEX_REX" : "LEGEND"} />}
          </p>
          {!followed && (
            <button
              onClick={(e) => { e.stopPropagation(); setFollowed(true); toast.success(`Following ${reel.user.handle}`); }}
              className="tap ml-1 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider"
              style={{ background: "var(--color-neon)", color: "#0b0b0b", letterSpacing: "0.14em" }}
            >
              Follow
            </button>
          )}
        </div>
        <p className="mt-2.5 text-[13.5px] leading-snug">{reel.caption}</p>
        <p className="mt-1 text-[12px]" style={{ color: "var(--color-neon)" }}>
          {reel.hashtags.slice(0, 3).join(" ")}
        </p>
        {reel.location && (
          <p className="mono-tag mt-1.5" style={{ color: "rgba(255,255,255,0.75)" }}>◎ {reel.location}</p>
        )}
        {reel.taggedProduct && (
          <div
            className="mt-2.5 inline-flex items-center gap-2 rounded-full px-2.5 py-1.5"
            style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(198,255,61,0.35)", backdropFilter: "blur(10px)" }}
          >
            <span style={{ color: "var(--color-neon)" }}>◇</span>
            <span className="text-[12px] font-semibold">{reel.taggedProduct.name}</span>
            <span className="mono-num text-[11px]" style={{ color: "var(--color-neon)" }}>{reel.taggedProduct.price}</span>
          </div>
        )}

        <div className="mt-3 flex items-center gap-2 overflow-hidden">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px]" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}>♫</span>
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="marquee whitespace-nowrap text-[11px]" style={{ color: "rgba(255,255,255,0.9)" }}>
              {reel.music.title} — {reel.music.artist} · original sound · {reel.views} views &nbsp;·&nbsp;
              {reel.music.title} — {reel.music.artist} &nbsp;·&nbsp;
            </p>
          </div>
        </div>
      </div>

      {/* Progress rail */}
      <div className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: "rgba(255,255,255,0.12)" }}>
        <div
          key={`${idx}-${active}`}
          style={{
            height: "100%",
            background: "var(--color-neon)",
            animation: active ? `reel-progress ${reel.duration}s linear forwards` : "none",
            width: active ? undefined : 0,
          }}
        />
      </div>

      {/* Comment sheet */}
      {commentsOpen && (
        <div
          className="absolute inset-0 z-50 flex flex-col justify-end"
          onClick={(e) => { e.stopPropagation(); setCommentsOpen(false); }}
        >
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-col rounded-t-3xl"
            style={{
              background: "#0f0f10",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              maxHeight: "72dvh",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full" style={{ background: "rgba(255,255,255,0.25)" }} />
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <p className="text-[13px] font-bold uppercase tracking-widest text-white" style={{ fontFamily: "var(--font-mono)" }}>
                Comments · {localComments.length}
              </p>
              <button
                onClick={() => setCommentsOpen(false)}
                className="tap grid h-8 w-8 place-items-center rounded-full text-white"
                style={{ background: "rgba(255,255,255,0.08)" }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-3">
              {localComments.map((c, i) => (
                <div key={i} className="flex items-start gap-3 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <img src={c.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold text-white">{c.handle}</p>
                    <p className="text-[13.5px] leading-snug" style={{ color: "rgba(255,255,255,0.85)" }}>{c.text}</p>
                  </div>
                  <button
                    className="tap grid h-8 w-8 place-items-center rounded-full text-white"
                    style={{ color: "rgba(255,255,255,0.7)" }}
                    aria-label="Like comment"
                  >
                    <IconClaw size={16} />
                  </button>
                </div>
              ))}
            </div>
            <form onSubmit={submitComment} className="flex items-center gap-2 border-t px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <input
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                placeholder="Add a comment…"
                className="flex-1 rounded-full bg-transparent px-4 py-2 text-[14px] text-white outline-none"
                style={{ border: "1px solid rgba(255,255,255,0.16)" }}
              />
              <button
                type="submit"
                disabled={!commentDraft.trim()}
                className="tap rounded-full px-4 py-2 text-[12px] font-bold uppercase tracking-wider disabled:opacity-40"
                style={{ background: "var(--color-neon)", color: "#0b0b0b", letterSpacing: "0.14em" }}
              >
                Post
              </button>
            </form>
          </div>
        </div>
      )}

      <ReportBlockSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetKind="reel"
        targetId={(reel as any).dbId}
        authorId={(reel as any).authorId}
        authorHandle={reel.user.handle}
      />
    </section>
  );
}


function RailBtn({
  Icon,
  count,
  active,
  tint,
  onClick,
}: {
  Icon: React.ComponentType<{ size?: number }>;
  count: string;
  active?: boolean;
  tint?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <button onClick={onClick} className="tap flex flex-col items-center gap-1">
      <span
        className="grid h-11 w-11 place-items-center rounded-full transition-transform active:scale-95"
        style={{
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.16)",
          color: active ? tint : "white",
          boxShadow: active ? `0 0 24px -4px ${tint}` : undefined,
        }}
      >
        <Icon size={20} />
      </span>
      <span className="mono-num text-[10.5px] font-semibold text-white">{count}</span>
    </button>
  );
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
