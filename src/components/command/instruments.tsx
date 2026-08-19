/**
 * Cockpit instruments for Mission Control.
 * Aircraft-panel + automotive-speedometer flavour with an amber "field lab"
 * (Jurassic Park) accent. Purely presentational SVG — no runtime deps.
 */
import type { ReactNode } from "react";

const AMBER = "#c07a12";

/** Analog gauge: sweeping needle over a ticked arc, like a tacho/altimeter. */
export function Gauge({
  label,
  value,
  max,
  unit,
  display,
  redline = 0.85,
  size = 148,
}: {
  label: string;
  value: number;
  max: number;
  unit?: string;
  display?: string;
  redline?: number;
  size?: number;
}) {
  const safeMax = max > 0 ? max : 1;
  const ratio = Math.max(0, Math.min(1, value / safeMax));
  const START = -220;
  const SWEEP = 260;
  const cx = 100;
  const cy = 100;
  const r = 74;

  const polar = (deg: number, radius: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };
  const arc = (from: number, to: number, radius: number) => {
    const a = polar(from, radius);
    const b = polar(to, radius);
    const large = to - from > 180 ? 1 : 0;
    return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
  };

  const ticks = Array.from({ length: 27 }, (_, i) => {
    const major = i % 5 === 0;
    const deg = START + (SWEEP * i) / 26;
    const outer = polar(deg, r);
    const inner = polar(deg, r - (major ? 14 : 7));
    return { major, deg, outer, inner };
  });

  const needle = polar(START + SWEEP * ratio, r - 20);
  const hot = ratio >= redline;

  return (
    <div
      className="relative flex flex-col items-center justify-center p-3"
      style={{
        border: "1px solid var(--color-hair)",
        borderRadius: 14,
        background:
          "radial-gradient(120% 90% at 50% 0%, var(--color-paper-0) 0%, var(--color-paper-2) 100%)",
      }}
    >
      <svg viewBox="0 0 200 190" width={size} height={size * 0.95} role="img" aria-label={`${label}: ${display ?? value}`}>
        <circle cx={cx} cy={cy} r={r + 12} fill="none" stroke="var(--color-hair)" strokeWidth={1} />
        <path d={arc(START, START + SWEEP, r)} fill="none" stroke="var(--color-hair-strong)" strokeWidth={2} />
        <path
          d={arc(START + SWEEP * redline, START + SWEEP, r)}
          fill="none"
          stroke="var(--color-heat)"
          strokeWidth={3}
          opacity={0.75}
        />
        <path
          d={arc(START, START + SWEEP * Math.max(ratio, 0.001), r)}
          fill="none"
          stroke={hot ? "var(--color-heat)" : "var(--color-neon)"}
          strokeWidth={5}
          strokeLinecap="round"
        />
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.inner.x}
            y1={t.inner.y}
            x2={t.outer.x}
            y2={t.outer.y}
            stroke={t.major ? "var(--color-ink-2)" : "var(--color-ink-4)"}
            strokeWidth={t.major ? 2 : 1}
          />
        ))}
        <line
          x1={cx}
          y1={cy}
          x2={needle.x}
          y2={needle.y}
          stroke={hot ? "var(--color-heat)" : "var(--color-ink-0)"}
          strokeWidth={3.5}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={9} fill="var(--color-ink-0)" />
        <circle cx={cx} cy={cy} r={3.5} fill={hot ? "var(--color-heat)" : "var(--color-neon)"} />
        <text
          x={cx}
          y={cy + 44}
          textAnchor="middle"
          className="tabular-nums"
          style={{ fontSize: 26, fontWeight: 650, fill: "var(--color-ink-0)" }}
        >
          {display ?? value}
        </text>
        {unit && (
          <text
            x={cx}
            y={cy + 62}
            textAnchor="middle"
            style={{ fontSize: 11, letterSpacing: 1.5, fill: "var(--color-ink-3)" }}
          >
            {unit.toUpperCase()}
          </text>
        )}
      </svg>
      <p className="mono-tag mt-1 text-center" style={{ color: AMBER }}>
        {label}
      </p>
    </div>
  );
}

/** Linear boost/temperature bar — engine-cluster style. */
export function BarMeter({
  label,
  value,
  max,
  display,
  tone = "neon",
}: {
  label: string;
  value: number;
  max: number;
  display?: string;
  tone?: "neon" | "amber" | "heat";
}) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  const color =
    tone === "heat" ? "var(--color-heat)" : tone === "amber" ? AMBER : "var(--color-neon)";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="mono-tag truncate" style={{ color: "var(--color-silver)" }}>
          {label}
        </p>
        <p className="text-[13px] font-semibold tabular-nums">{display ?? value}</p>
      </div>
      <div
        className="mt-1 h-2 overflow-hidden"
        style={{ background: "var(--color-paper-3)", borderRadius: 99 }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 99,
            background: `linear-gradient(90deg, ${color}, color-mix(in oklab, ${color} 55%, #ffffff))`,
            transition: "width 600ms cubic-bezier(.2,.8,.2,1)",
          }}
        />
      </div>
    </div>
  );
}

/** Vertical bar chart for revenue streams / any labelled series. */
export function BarChart({
  series,
  format,
  height = 150,
}: {
  series: { label: string; value: number }[];
  format?: (n: number) => string;
  height?: number;
}) {
  const max = Math.max(1, ...series.map((s) => s.value));
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {series.map((s) => {
        const h = Math.max(3, (s.value / max) * (height - 44));
        return (
          <div key={s.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] tabular-nums" style={{ color: "var(--color-ink-2)" }}>
              {format ? format(s.value) : s.value}
            </span>
            <div
              style={{
                width: "100%",
                height: h,
                borderRadius: "4px 4px 0 0",
                background:
                  "linear-gradient(180deg, var(--color-neon), color-mix(in oklab, var(--color-neon) 40%, #ffffff))",
                boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
                transition: "height 600ms cubic-bezier(.2,.8,.2,1)",
              }}
            />
            <span
              className="mono-tag w-full truncate text-center text-[9px]"
              style={{ color: "var(--color-ink-3)" }}
              title={s.label}
            >
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Warning annunciator lamp — dark cockpit strip, amber when live. */
export function Lamp({
  label,
  active,
  tone = "amber",
  children,
}: {
  label: string;
  active?: boolean;
  tone?: "amber" | "heat" | "neon";
  children?: ReactNode;
}) {
  const color =
    tone === "heat" ? "var(--color-heat)" : tone === "neon" ? "var(--color-neon)" : AMBER;
  return (
    <div
      className="flex items-center gap-2 px-3 py-2"
      style={{
        borderRadius: 8,
        border: `1px solid ${active ? color : "var(--color-hair)"}`,
        background: active ? `color-mix(in oklab, ${color} 12%, transparent)` : "transparent",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: 99,
          background: active ? color : "var(--color-ink-4)",
          boxShadow: active ? `0 0 10px ${color}` : "none",
        }}
      />
      <span className="mono-tag truncate" style={{ color: active ? color : "var(--color-silver)" }}>
        {label}
      </span>
      <span className="ml-auto text-[13px] font-semibold tabular-nums">{children}</span>
    </div>
  );
}

/** Amber CRT header strip — "field lab terminal" flavour. */
export function CockpitHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header
      className="relative overflow-hidden px-4 py-4"
      style={{
        borderRadius: 14,
        border: "1px solid var(--color-hair-strong)",
        background:
          "linear-gradient(180deg, var(--color-ink-0), var(--color-ink-1))",
        color: "#f5efe2",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 3px)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(192,122,18,0.18), transparent 45%, rgba(0,200,83,0.14))",
        }}
      />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="mono-tag" style={{ color: AMBER }}>
            ◆ SYSTEMS NOMINAL · PARK OPERATIONS
          </p>
          <h1 className="truncate text-2xl font-semibold">{title}</h1>
          {subtitle && (
            <p className="mt-0.5 text-[12px]" style={{ color: "rgba(245,239,226,0.6)" }}>
              {subtitle}
            </p>
          )}
        </div>
        {right}
      </div>
    </header>
  );
}
