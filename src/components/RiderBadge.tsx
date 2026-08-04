/**
 * Rider status badges — replaces generic verification checkmark.
 * Each tier is a machined metallic chip with a distinct finish.
 */

export type RiderTier =
  | "TURBO"
  | "NITRO"
  | "APEX_REX"
  | "ELITE"
  | "LEGEND"
  | "MASTER_BUILDER"
  | "BOOSTED"
  | "VERIFIED_GARAGE"
  | "FACTORY"
  | "FOUNDER";

const TIERS: Record<
  RiderTier,
  { label: string; glyph: string; finish: "metal" | "neon" | "carbon" | "gold" }
> = {
  TURBO: { label: "TURBO", glyph: "⚡", finish: "neon" },
  NITRO: { label: "NITRO", glyph: "◈", finish: "neon" },
  APEX_REX: { label: "APEX·REX", glyph: "▲", finish: "carbon" },
  ELITE: { label: "ELITE", glyph: "◆", finish: "metal" },
  LEGEND: { label: "LEGEND", glyph: "☠", finish: "carbon" },
  MASTER_BUILDER: { label: "BUILDER", glyph: "⚙", finish: "metal" },
  BOOSTED: { label: "BOOST", glyph: "»", finish: "neon" },
  VERIFIED_GARAGE: { label: "VFD·GRG", glyph: "⌂", finish: "metal" },
  FACTORY: { label: "FACTORY", glyph: "▣", finish: "carbon" },
  FOUNDER: { label: "FOUNDER", glyph: "✦", finish: "gold" },
};

export function RiderBadge({
  tier,
  compact = false,
  className = "",
}: {
  tier: RiderTier;
  compact?: boolean;
  className?: string;
}) {
  const t = TIERS[tier];
  const finishClass =
    t.finish === "metal"
      ? "badge-metal sheen"
      : t.finish === "neon"
        ? "badge-metal badge-neon sheen"
        : t.finish === "carbon"
          ? "badge-metal badge-carbon"
          : "badge-metal badge-gold sheen";
  return (
    <span className={`${finishClass} ${className}`} title={t.label}>
      <span aria-hidden style={{ fontSize: 10, lineHeight: 1 }}>
        {t.glyph}
      </span>
      {!compact && <span>{t.label}</span>}
    </span>
  );
}

/** Small inline marker to place next to a user's name — a metallic dot with tier glyph */
export function RiderMark({ tier }: { tier: RiderTier }) {
  const t = TIERS[tier];
  const bg =
    t.finish === "neon"
      ? "linear-gradient(180deg,#dbff8b,#7ed321)"
      : t.finish === "carbon"
        ? "linear-gradient(180deg,#2a2d33,#0e0f11)"
        : t.finish === "gold"
          ? "linear-gradient(180deg,#f7e58a,#c9a24a)"
          : "linear-gradient(180deg,#f4f5f8,#c7cbd1)";
  const color = t.finish === "carbon" ? "#b6ff3c" : "#0e0f11";
  return (
    <span
      title={t.label}
      aria-label={`Verified rider: ${t.label}`}
      className="engine-pulse inline-grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold"
      style={{ background: bg, color, border: "1px solid rgba(0,0,0,0.25)" }}
    >
      {t.glyph}
    </span>
  );
}
