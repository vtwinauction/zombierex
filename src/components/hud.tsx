import { type ReactNode } from "react";

/** Angular corner-chamfered panel with optional slash-header. */
export function Panel({
  children,
  className = "",
  variant = "bone",
  chamfer = true,
}: {
  children: ReactNode;
  className?: string;
  variant?: "bone" | "ink" | "signal";
  chamfer?: boolean;
}) {
  const base = variant === "ink" ? "panel-ink" : variant === "signal" ? "panel-signal" : "panel";
  return <div className={`${base} ${chamfer ? "clip-chamfer" : ""} ${className}`}>{children}</div>;
}

/** Slash-prefixed section header ala // MISSIONS · 03 */
export function SlashHeader({
  label,
  count,
  right,
}: {
  label: string;
  count?: string | number;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="flex items-baseline gap-2">
        <span className="mono-caps text-signal-ink font-bold">//</span>
        <h2 className="font-display text-xl leading-none tracking-wide uppercase">{label}</h2>
        {count !== undefined && (
          <span className="mono-num text-ash text-xs">[{String(count).padStart(2, "0")}]</span>
        )}
      </div>
      {right}
    </div>
  );
}

/** Hex-clipped identity chip — replaces round avatars. */
export function HexChip({ src, size = 40, live }: { src: string; size?: number; live?: boolean }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size * 1.08 }}>
      <div className="clip-hex bg-ink absolute inset-0" />
      <img src={src} alt="" className="clip-hex absolute object-cover" style={{ inset: 2 }} />
      {live && (
        <span
          className="clip-hex absolute -right-1 -top-1 signal-pulse block bg-signal"
          style={{ width: 10, height: 11 }}
        />
      )}
    </div>
  );
}

/** Data chip · KEY : VALUE */
export function DataChip({
  k,
  v,
  tone = "default",
}: {
  k: string;
  v: string | number;
  tone?: "default" | "signal" | "warn";
}) {
  const toneClass =
    tone === "signal"
      ? "bg-signal text-ink"
      : tone === "warn"
        ? "bg-warn text-bone"
        : "bg-mist text-ink";
  return (
    <span className={`clip-chamfer-sm inline-flex items-center gap-1 px-2 py-1 ${toneClass}`}>
      <span className="mono-caps opacity-70">{k}</span>
      <span className="mono-num text-[11px] font-bold">{v}</span>
    </span>
  );
}

/** Angular action button — pill-free, right-angled with a chamfer. */
export function AngularButton({
  children,
  onClick,
  variant = "ghost",
  size = "md",
  className = "",
  active,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "ghost" | "solid" | "signal" | "warn";
  size?: "sm" | "md";
  className?: string;
  active?: boolean;
}) {
  const v =
    variant === "solid"
      ? "bg-ink text-bone"
      : variant === "signal"
        ? "bg-signal text-ink"
        : variant === "warn"
          ? "bg-warn text-bone"
          : "bg-bone text-ink";
  const s = size === "sm" ? "h-8 px-3 text-[11px]" : "h-10 px-4 text-xs";
  return (
    <button
      onClick={onClick}
      className={`tap clip-chamfer-sm mono-caps inline-flex items-center gap-2 border border-ink font-bold ${v} ${s} ${active ? "ring-2 ring-signal-deep ring-offset-0" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

/** Radial telemetry ring */
export function GaugeRing({
  value,
  max,
  label,
  unit,
  size = 88,
}: {
  value: number;
  max: number;
  label: string;
  unit?: string;
  size?: number;
}) {
  const pct = Math.min(1, value / max);
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-mist)"
          strokeWidth="4"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-signal)"
          strokeWidth="4"
          strokeDasharray={`${c * pct} ${c}`}
          strokeLinecap="butt"
        />
        <g transform={`rotate(90 ${size / 2} ${size / 2})`}>
          <text
            x="50%"
            y="48%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="mono-num fill-ink"
            fontSize="18"
            fontWeight="700"
          >
            {value.toLocaleString()}
          </text>
          <text
            x="50%"
            y="66%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-ash"
            fontFamily="var(--font-mono)"
            fontSize="8"
            letterSpacing="2"
          >
            {unit ?? ""}
          </text>
        </g>
      </svg>
      <span className="mono-caps text-ash">{label}</span>
    </div>
  );
}

/** Vertical tick ruler with a value marker */
export function TickBar({
  value,
  max,
  className = "",
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className={`relative h-2 w-full border border-ink bg-bone ${className}`}>
      <div className="rule-tick absolute inset-x-1 top-1/2 -translate-y-1/2 opacity-40" />
      <div className="absolute inset-y-0 left-0 bg-signal" style={{ width: `${pct}%` }} />
    </div>
  );
}
