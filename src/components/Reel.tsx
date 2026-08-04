import { useRef, useState } from "react";
import type { Reel as ReelType } from "@/lib/types";

// Custom hand-drawn glyphs — no lucide defaults on the video surface
const Glyph = {
  Heart: ({ filled, className = "" }: { filled?: boolean; className?: string }) => (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.4}
    >
      <path d="M12 20s-7-4.5-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.5-9 9-9 9z" strokeLinejoin="miter" />
    </svg>
  ),
  Speak: ({ className = "" }: { className?: string }) => (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
    >
      <path d="M4 5h16v11H9l-5 4V5z" strokeLinejoin="miter" strokeLinecap="square" />
    </svg>
  ),
  Send: ({ className = "" }: { className?: string }) => (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
    >
      <path d="M3 12L21 4l-8 18-2-8-8-2z" strokeLinejoin="miter" strokeLinecap="square" />
    </svg>
  ),
  Save: ({ filled, className = "" }: { filled?: boolean; className?: string }) => (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.4}
    >
      <path d="M6 3h12v18l-6-4-6 4V3z" strokeLinejoin="miter" strokeLinecap="square" />
    </svg>
  ),
  Mute: ({ muted, className = "" }: { muted?: boolean; className?: string }) => (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
    >
      <path d="M3 9v6h4l5 4V5L7 9H3z" strokeLinejoin="miter" strokeLinecap="square" />
      {muted && <path d="M16 9l6 6M22 9l-6 6" strokeLinecap="square" />}
      {!muted && <path d="M16 8a5 5 0 010 8" />}
    </svg>
  ),
  Corner: ({ className = "" }: { className?: string }) => (
    <svg
      viewBox="0 0 12 12"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
    >
      <path d="M0 4V0h4" strokeLinecap="square" />
    </svg>
  ),
};

export function Reel({ reel }: { reel: ReelType }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [followed, setFollowed] = useState(!!reel.followed);
  const [muted, setMuted] = useState(true);
  const [burst, setBurst] = useState(0);
  const lastTap = useRef(0);

  const handleMediaTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      setLiked(true);
      setBurst((b) => b + 1);
    }
    lastTap.current = now;
  };

  const likeCount = reel.likes + (liked ? 1 : 0);

  return (
    <section className="snap-item relative h-[100svh] w-full overflow-hidden bg-bone">
      {/* Media */}
      <button onClick={handleMediaTap} className="absolute inset-0 h-full w-full" aria-label="Play">
        <img
          src={reel.poster}
          alt=""
          className="ken-burns h-full w-full object-cover"
          draggable={false}
        />
      </button>

      {/* Top + bottom vignettes */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 to-transparent" />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%]"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.92) 100%)",
        }}
      />

      {/* Precision corner marks (top-left / top-right) */}
      <div
        className="pointer-events-none absolute left-3 top-[max(env(safe-area-inset-top),12px)]"
        style={{ color: "rgba(255,255,255,0.75)" }}
      >
        <Glyph.Corner className="h-3 w-3" />
      </div>
      <div
        className="pointer-events-none absolute right-3 top-[max(env(safe-area-inset-top),12px)] rotate-90"
        style={{ color: "rgba(255,255,255,0.75)" }}
      >
        <Glyph.Corner className="h-3 w-3" />
      </div>

      {/* Top metadata rail */}
      <div className="absolute inset-x-4 top-[max(env(safe-area-inset-top),18px)] flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          <span className="mono-tag" style={{ color: "rgba(255,255,255,0.7)" }}>
            REEL·{reel.id.toUpperCase()}
          </span>
          <span className="mono-tag" style={{ color: "rgba(255,255,255,0.5)" }}>
            · {String(reel.duration).padStart(2, "0")}s
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMuted((m) => !m);
          }}
          className="tap hairline flex h-8 w-8 items-center justify-center"
          style={{ borderColor: "rgba(255,255,255,0.35)" }}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          <Glyph.Mute muted={muted} className="h-4 w-4" />
        </button>
      </div>

      {/* Progress hairlines — segmented */}
      <div className="pointer-events-none absolute inset-x-4 top-[calc(max(env(safe-area-inset-top),18px)+36px)] flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[2px] flex-1 overflow-hidden"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            {i === 0 && <div key={burst} className="progress-bar h-full origin-left bg-white" />}
          </div>
        ))}
      </div>

      {/* Heart burst */}
      {burst > 0 && (
        <Glyph.Heart
          key={burst}
          filled
          className="heart-burst pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 text-white drop-shadow-[0_10px_40px_rgba(255,255,255,0.35)]"
        />
      )}

      {/* Right action rail — thin icons + mono numbers */}
      <div className="absolute right-3 top-1/2 flex -translate-y-1/2 flex-col items-center gap-5 text-white">
        <RailBtn
          icon={<Glyph.Heart filled={liked} className="h-6 w-6" />}
          value={fmt(likeCount)}
          highlight={liked ? "var(--color-heat)" : undefined}
          onClick={() => {
            setLiked((v) => !v);
            if (!liked) setBurst((b) => b + 1);
          }}
        />
        <RailBtn icon={<Glyph.Speak className="h-6 w-6" />} value={fmt(reel.comments)} />
        <RailBtn icon={<Glyph.Send className="h-6 w-6" />} value={fmt(reel.shares)} />
        <RailBtn
          icon={<Glyph.Save filled={saved} className="h-6 w-6" />}
          value={saved ? "SAVED" : "SAVE"}
          highlight={saved ? "var(--color-signal)" : undefined}
          onClick={() => setSaved((v) => !v)}
        />
      </div>

      {/* Bottom editorial block */}
      <div className="absolute inset-x-0 bottom-20 z-10 space-y-4 px-4 text-white">
        {/* Creator strip */}
        <div className="flex items-center gap-3">
          <div className="story-ring">
            <div className="bg-bone p-[2px]">
              <img
                src={reel.user.avatar}
                alt=""
                className="h-10 w-10 object-cover"
                style={{ borderRadius: 0 }}
              />
            </div>
          </div>
          <div className="min-w-0 leading-tight">
            <p className="mono-tag" style={{ color: "rgba(255,255,255,0.6)" }}>
              {reel.user.handle}
            </p>
            <p className="text-sm font-bold">{reel.user.name}</p>
          </div>
          <button
            onClick={() => setFollowed((f) => !f)}
            className="tap ml-auto"
            style={{
              padding: "6px 12px",
              border: "1px solid rgba(255,255,255,0.6)",
              background: followed ? "transparent" : "white",
              color: followed ? "white" : "black",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            {followed ? "TRACKING" : "+ TRACK"}
          </button>
        </div>

        {/* Editorial caption */}
        <p
          className="max-w-[85%] text-[15px] font-medium leading-snug"
          style={{ letterSpacing: "-0.01em" }}
        >
          {reel.caption}
        </p>

        {/* Tagged vehicle — spec strip */}
        {reel.vehicle && (
          <div
            className="grid grid-cols-4 items-center gap-0 border border-white/25"
            style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(14px)" }}
          >
            <div className="col-span-1 border-r border-white/25 px-3 py-2">
              <p className="mono-tag" style={{ color: "rgba(255,255,255,0.55)" }}>
                YEAR
              </p>
              <p className="mono-num text-sm font-bold">{reel.vehicle.year}</p>
            </div>
            <div className="col-span-1 border-r border-white/25 px-3 py-2">
              <p className="mono-tag" style={{ color: "rgba(255,255,255,0.55)" }}>
                HP
              </p>
              <p className="mono-num text-sm font-bold">{reel.vehicle.hp}</p>
            </div>
            <div className="col-span-2 px-3 py-2">
              <p className="mono-tag" style={{ color: "rgba(255,255,255,0.55)" }}>
                MACHINE
              </p>
              <p className="truncate text-sm font-bold">{reel.vehicle.name}</p>
            </div>
          </div>
        )}

        {/* Bottom footer row: location + music */}
        <div
          className="hairline-t flex items-center gap-3 pt-3"
          style={{ borderColor: "rgba(255,255,255,0.2)" }}
        >
          {reel.location && (
            <span className="mono-tag" style={{ color: "rgba(255,255,255,0.7)" }}>
              ◎ {reel.location}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2 overflow-hidden">
            <div className="flex h-3 items-end gap-[2px]">
              <span className="bar-1 w-[2px] rounded-full bg-white/80" />
              <span className="bar-2 w-[2px] rounded-full bg-white/80" />
              <span className="bar-3 w-[2px] rounded-full bg-white/80" />
              <span className="bar-4 w-[2px] rounded-full bg-white/80" />
            </div>
            <span
              className="mono-tag truncate"
              style={{ color: "rgba(255,255,255,0.7)", maxWidth: 160 }}
            >
              {reel.music.artist} — {reel.music.title}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function RailBtn({
  icon,
  value,
  onClick,
  highlight,
}: {
  icon: React.ReactNode;
  value: string;
  onClick?: () => void;
  highlight?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="tap flex flex-col items-center gap-1.5"
      style={highlight ? { color: highlight } : undefined}
    >
      {icon}
      <span className="mono-num text-[10px] font-bold" style={{ letterSpacing: "0.05em" }}>
        {value}
      </span>
    </button>
  );
}

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
