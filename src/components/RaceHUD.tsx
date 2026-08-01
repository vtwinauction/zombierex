/**
 * RaceHUD — dual-lane immersive drag HUD.
 *
 * Left lane: player (live GPS). Right lane: AI ghost opponent.
 * Both lanes show analog+digital speed, RPM-style bar, gear estimate, splits.
 * Below: leader board with distance gap and win probability.
 */
import { useMemo } from "react";

export interface LaneTelemetry {
  name: string;
  color: string; // accent
  kmh: number;
  peakKmh: number;
  distanceM: number;
  reactionMs: number | null;
  splits: { s60ft?: number | null; s330ft?: number | null; eighthS?: number | null; eighthTrap?: number | null; s1000ft?: number | null; quarterS?: number | null; quarterTrap?: number | null };
  gpsAccuracyM?: number | null;
  isGhost?: boolean;
}

export function RaceHUD({
  player,
  ghost,
  elapsedMs,
  finished,
}: {
  player: LaneTelemetry;
  ghost: LaneTelemetry;
  elapsedMs: number;
  finished: boolean;
}) {
  const gap = player.distanceM - ghost.distanceM;
  const leader = gap >= 0 ? player : ghost;
  const trail = gap >= 0 ? ghost : player;
  const speedDelta = player.kmh - ghost.kmh;

  const playerProb = useMemo(() => {
    // Simple heuristic: distance gap dominates late, speed delta early
    const distScore = Math.tanh(gap / 12); // ~ -1..1
    const spdScore = Math.tanh(speedDelta / 25);
    const reactScore = player.reactionMs != null && ghost.reactionMs != null
      ? Math.tanh(((ghost.reactionMs - player.reactionMs) / 200))
      : 0;
    const raw = 0.55 * distScore + 0.3 * spdScore + 0.15 * reactScore;
    return Math.max(2, Math.min(98, Math.round(50 + raw * 50)));
  }, [gap, speedDelta, player.reactionMs, ghost.reactionMs]);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Lane t={player} elapsedMs={elapsedMs} />
        <Lane t={ghost} elapsedMs={elapsedMs} />
      </div>

      {/* Leaderboard bar */}
      <div
        className="rounded-2xl border p-3"
        style={{
          borderColor: "var(--color-hair-strong)",
          background: "hsl(var(--card))",
        }}
      >
        <div className="flex items-center justify-between text-xs">
          <span className="mono-caps" style={{ color: "var(--color-silver)", letterSpacing: "0.24em" }}>LEADER</span>
          <span className="mono-caps" style={{ color: leader.color, fontWeight: 800 }}>
            {finished ? "◆ WIN" : "▲"} {leader.name.toUpperCase()}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <Metric label="GAP" value={`${Math.abs(gap).toFixed(1)} m`} accent={leader.color} />
          <Metric label="Δ SPEED" value={`${speedDelta >= 0 ? "+" : ""}${speedDelta.toFixed(0)} km/h`} accent={speedDelta >= 0 ? player.color : ghost.color} />
          <Metric label="AI WIN P%" value={`${playerProb}%`} accent="#00c853" />
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded" style={{ background: "hsl(var(--muted))" }}>
          <div style={{ width: `${playerProb}%`, height: "100%", background: player.color, transition: "width 200ms ease-out" }} />
        </div>
      </div>
    </div>
  );
}

function Lane({ t, elapsedMs }: { t: LaneTelemetry; elapsedMs: number }) {
  const pct = Math.min(1, t.kmh / 320);
  const gear = estimateGear(t.kmh);
  const speedColor = t.kmh < 80 ? "#00c853" : t.kmh < 160 ? "#f6d84f" : t.kmh < 220 ? "#ff8c1a" : "#ff3b30";
  const finishPct = Math.min(1, t.distanceM / 402.336);
  return (
    <div
      className="rounded-2xl border p-3"
      style={{
        borderColor: "var(--color-hair-strong)",
        background: "hsl(var(--card))",
        boxShadow: `0 0 24px ${t.color}22`,
      }}
    >
      <div className="flex items-center justify-between">
        <span className="mono-caps" style={{ color: t.color, fontSize: 10, letterSpacing: "0.24em", fontWeight: 800 }}>
          {t.isGhost ? "◇" : "◆"} {t.name.toUpperCase()}
        </span>
        <span className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 9 }}>
          {t.gpsAccuracyM != null ? `±${t.gpsAccuracyM.toFixed(0)}m` : t.isGhost ? "AI" : "GPS"}
        </span>
      </div>

      <AnalogGauge kmh={t.kmh} color={speedColor} />

      <div className="mt-1 flex items-end justify-center gap-1">
        <span className="mono-num tabular-nums font-black" style={{ fontSize: 44, lineHeight: 1, color: "hsl(var(--foreground))", textShadow: `0 0 18px ${speedColor}80` }}>
          {t.kmh.toFixed(0)}
        </span>
        <span className="mono-caps pb-1" style={{ color: "var(--color-silver)", fontSize: 9, letterSpacing: "0.24em" }}>km/h</span>
      </div>

      <div className="mt-1 flex items-center justify-between text-[10px]" style={{ color: "var(--color-silver)" }}>
        <span className="mono-tag">PEAK {t.peakKmh.toFixed(0)}</span>
        <span className="mono-tag">G{gear}</span>
        <span className="mono-tag">{t.distanceM.toFixed(0)}m</span>
      </div>

      {/* RPM-style bar */}
      <div className="mt-2 flex gap-[2px]">
        {Array.from({ length: 20 }).map((_, i) => {
          const on = i / 20 < pct;
          const c = i < 12 ? "#00c853" : i < 16 ? "#f6d84f" : "#ff3b30";
          return (
            <div
              key={i}
              style={{
                flex: 1, height: 6, borderRadius: 1,
                background: on ? c : "hsl(var(--muted))",
                boxShadow: on ? `0 0 6px ${c}` : "none",
                transition: "background 80ms linear",
              }}
            />
          );
        })}
      </div>

      {/* Finish line progress */}
      <div className="mt-2">
        <div className="mono-tag flex justify-between" style={{ color: "var(--color-silver)", fontSize: 8 }}>
          <span>LAUNCH</span><span>1/8</span><span>1/4</span>
        </div>
        <div className="mt-1 h-1 w-full overflow-hidden rounded" style={{ background: "hsl(var(--muted))" }}>
          <div style={{ width: `${finishPct * 100}%`, height: "100%", background: t.color, transition: "width 200ms ease-out" }} />
        </div>
      </div>

      {/* Splits */}
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
        <Split label="RT" v={t.reactionMs != null ? `${(t.reactionMs / 1000).toFixed(3)}` : "—"} />
        <Split label="60FT" v={t.splits.s60ft != null ? t.splits.s60ft.toFixed(2) : "—"} />
        <Split label="330FT" v={t.splits.s330ft != null ? t.splits.s330ft.toFixed(2) : "—"} />
        <Split label="1/8" v={t.splits.eighthS != null ? t.splits.eighthS.toFixed(2) : "—"} />
        <Split label="1/8 TRAP" v={t.splits.eighthTrap != null ? `${t.splits.eighthTrap.toFixed(0)}` : "—"} />
        <Split label="1/4" v={t.splits.quarterS != null ? t.splits.quarterS.toFixed(2) : "—"} />
      </div>
    </div>
  );
}

function AnalogGauge({ kmh, color }: { kmh: number; color: string }) {
  const max = 320;
  const pct = Math.max(0, Math.min(1, kmh / max));
  const size = 128;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const arc = c * 0.75;
  const dash = arc * pct;
  // Needle
  const angleDeg = -135 + 270 * pct;
  return (
    <div style={{ position: "relative", width: size, height: size * 0.75, margin: "0 auto" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(135deg)", position: "absolute", top: -size * 0.12, left: 0 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="color-mix(in oklab, currentColor 12%, transparent)" strokeWidth={stroke} strokeDasharray={`${arc} ${c}`} strokeLinecap="round" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={`${dash} ${c}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 220ms ease-out, stroke 220ms linear", filter: `drop-shadow(0 0 6px ${color}aa)` }} />
      </svg>
      <div style={{
        position: "absolute", left: "50%", bottom: "8%", width: 2, height: size * 0.42,
        background: `linear-gradient(180deg, ${color}, hsl(var(--foreground)))`,
        transformOrigin: "50% 100%",
        transform: `translateX(-50%) rotate(${angleDeg}deg)`,
        transition: "transform 220ms cubic-bezier(.2,.9,.2,1)",
        boxShadow: `0 0 6px ${color}`,
      }} />
      <div style={{ position: "absolute", left: "50%", bottom: "6%", width: 10, height: 10, borderRadius: 5, transform: "translateX(-50%)", background: "var(--color-obsidian)", boxShadow: `0 0 0 2px ${color}` }} />
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div>
      <p className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 8 }}>{label}</p>
      <p className="mono-num text-sm font-black tabular-nums" style={{ color: accent }}>{value}</p>
    </div>
  );
}

function Split({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded" style={{ padding: "4px 2px", background: "hsl(var(--muted))" }}>
      <p className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 7 }}>{label}</p>
      <p className="mono-num tabular-nums font-bold" style={{ color: "hsl(var(--foreground))", fontSize: 11 }}>{v}</p>
    </div>
  );
}

function estimateGear(kmh: number): number {
  if (kmh < 30) return 1;
  if (kmh < 65) return 2;
  if (kmh < 105) return 3;
  if (kmh < 155) return 4;
  if (kmh < 210) return 5;
  return 6;
}

export default RaceHUD;
