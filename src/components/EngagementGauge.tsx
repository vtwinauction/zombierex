import { useEffect, useRef, useState } from "react";

/**
 * Compact speedometer-style arc used behind each engagement control.
 *
 * Purely visual — it reads the count it is given and sweeps a 240° arc on a
 * logarithmic scale so a post with 12 likes and a post with 1.2M likes both
 * read sensibly. No data fetching, no layout impact: it is absolutely
 * positioned behind the icon it decorates.
 */

const SWEEP = 240; // degrees of travel
const START = 150; // start angle (bottom-left)

/** log10 scale: 0 → 0, 10 → 0.25, 1k → 0.5, 100k → 0.75, 10M → 1 */
function toRatio(n: number) {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(1, Math.log10(n + 1) / 7);
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy - r * Math.sin(rad)] as const;
}

function arcPath(cx: number, cy: number, r: number, from: number, to: number) {
  const [x1, y1] = polar(cx, cy, r, from);
  const [x2, y2] = polar(cx, cy, r, to);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  // sweeping clockwise (decreasing angle)
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

export function EngagementGauge({
  value,
  size = 38,
  active = false,
  color = "var(--color-neon)",
}: {
  value: number;
  size?: number;
  active?: boolean;
  color?: string;
}) {
  const r = size / 2 - 2.5;
  const cx = size / 2;
  const cy = size / 2;
  const track = arcPath(cx, cy, r, START, START - SWEEP);
  const len = (SWEEP / 360) * 2 * Math.PI * r;

  const ratio = toRatio(value);
  // Animate from 0 on first paint so the needle "spools up" once, then
  // transitions smoothly on every count change.
  const [shown, setShown] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => setShown(ratio));
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [ratio]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 m-auto"
      style={{ overflow: "visible" }}
    >
      <path
        d={track}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        style={{ color: "var(--color-titanium)", opacity: 0.35 }}
      />
      <path
        d={track}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={`${len} ${len}`}
        strokeDashoffset={len * (1 - shown)}
        style={{
          transition: "stroke-dashoffset 420ms cubic-bezier(0.22,1,0.36,1)",
          filter: active
            ? "drop-shadow(0 0 5px rgba(0,200,83,0.85))"
            : "drop-shadow(0 0 2px rgba(0,200,83,0.35))",
          opacity: shown === 0 ? 0.5 : 1,
        }}
      />
    </svg>
  );
}
