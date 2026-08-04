import { useState, type ComponentType } from "react";
import type { Post } from "@/lib/types";
import { HexChip, DataChip } from "./hud";
import { IconClaw, IconVisor, IconMechClaw, IconBoneMark } from "./icons/RexIcons";
import { RiderMark } from "./RiderBadge";

/** Post rebuilt as a telemetry readout: left spec column, media plate, right action rail. */
export function TelemetryPost({ post, index = 0 }: { post: Post; index?: number }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <article
      className="hud-in grid grid-cols-[36px_1fr_44px] border border-ink bg-bone"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* LEFT: spec column */}
      <aside className="flex flex-col items-center justify-between border-r border-ink bg-mist py-2">
        <span className="mono-caps text-ash rotate-180 [writing-mode:vertical-rl]">
          UNIT · {post.id.toUpperCase()}
        </span>
        <span className="mono-num text-[10px] font-bold text-ink">{post.timeAgo}</span>
      </aside>

      {/* CENTER: header + media + caption */}
      <div className="flex min-w-0 flex-col">
        {/* HEADER STRIP */}
        <div className="flex items-center gap-2 border-b border-ink px-3 py-2">
          <HexChip src={post.user.avatar} size={32} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="font-display truncate text-sm font-semibold uppercase leading-none">
                {post.user.name}
              </p>
              {post.user.verified && <RiderMark tier="ELITE" />}
            </div>
            <p className="mono-caps text-ash mt-0.5 truncate">
              {post.user.handle} · {post.user.location}
            </p>
          </div>
          <button className="tap mono-caps border border-ink px-2 py-1 text-[9px]">TRACK</button>
        </div>

        {/* MEDIA PLATE with clipped notch corner */}
        <div className="relative">
          <img
            src={post.image}
            alt=""
            className="block h-64 w-full object-cover"
            onDoubleClick={() => setLiked(true)}
          />
          {/* diagonal tag corner top-right */}
          <div className="clip-tag bg-signal absolute right-0 top-0 flex items-center gap-1 px-2 py-0.5">
            <span className="mono-caps text-ink font-bold">REC</span>
          </div>
          {/* bottom vehicle telemetry bar */}
          {post.vehicle && (
            <div className="panel-ink absolute inset-x-0 bottom-0 flex items-center gap-2 px-2 py-1.5">
              <span className="mono-caps text-signal">◇</span>
              <span className="font-display truncate text-xs uppercase">{post.vehicle.name}</span>
              <div className="ml-auto flex items-center gap-1">
                <span className="mono-num text-signal text-[10px] font-bold">
                  {post.vehicle.hp}HP
                </span>
                <span className="text-bone/40">·</span>
                <span className="mono-num text-bone/80 text-[10px]">{post.vehicle.year}</span>
              </div>
            </div>
          )}
          {liked && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span
                className="heart-burst text-signal"
                style={{ filter: "drop-shadow(0 4px 12px rgba(182,255,60,0.8))" }}
              >
                <IconClaw size={92} strokeWidth={2.5} />
              </span>
            </span>
          )}
        </div>

        {/* CAPTION + DATA CHIPS */}
        <div className="space-y-2 border-t border-ink px-3 py-2">
          <p className="text-[13px] leading-snug text-ink">{post.caption}</p>
          <div className="flex flex-wrap gap-1">
            {post.tags.map((t) => (
              <span key={t} className="mono-caps border border-ink px-1.5 py-0.5 text-[9px]">
                {t}
              </span>
            ))}
          </div>
          {/* engagement telemetry */}
          <div className="flex items-center gap-1 pt-1">
            <DataChip
              k="LIKES"
              v={(post.likes + (liked ? 1 : 0)).toLocaleString()}
              tone={liked ? "signal" : "default"}
            />
            <DataChip k="CMTS" v={post.comments} />
            <DataChip k="VIEW" v={`${((post.likes * 6.2) / 1000).toFixed(1)}k`} />
          </div>
        </div>
      </div>

      {/* RIGHT: vertical action rail — fossil/mechanical glyphs */}
      <div className="flex flex-col items-stretch justify-start border-l border-ink bg-mist">
        <RailAction
          Icon={IconClaw}
          label="LIKE"
          active={liked}
          onClick={() => setLiked((v) => !v)}
          tone="signal"
        />
        <RailAction Icon={IconVisor} label="RPLY" />
        <RailAction Icon={IconMechClaw} label="SEND" />
        <RailAction
          Icon={IconBoneMark}
          label="SAVE"
          active={saved}
          onClick={() => setSaved((v) => !v)}
        />
      </div>
    </article>
  );
}

function RailAction({
  Icon,
  label,
  onClick,
  active,
  tone,
}: {
  Icon: ComponentType<{ size?: number }>;
  label: string;
  onClick?: () => void;
  active?: boolean;
  tone?: "signal";
}) {
  return (
    <button
      onClick={onClick}
      className={`tap flex flex-1 flex-col items-center justify-center gap-1 border-b border-ink py-2 ${
        active ? (tone === "signal" ? "bg-signal text-ink" : "bg-ink text-bone") : "text-ink"
      }`}
    >
      <Icon size={18} />
      <span className="mono-caps" style={{ fontSize: 8 }}>
        {label}
      </span>
    </button>
  );
}
