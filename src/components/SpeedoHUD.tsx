/**
 * SpeedoHUD — compact live speedometer overlay for the Atlas / Recorder.
 * Reads GPS `position.coords.speed` (m/s) with a lightweight EMA to smooth jitter.
 * Renders a digital readout with a segmented arc.
 */
import { useEffect, useRef, useState } from "react";

type Unit = "kmh" | "mph";

export function SpeedoHUD({
  unit = "kmh",
  max,
  compact = false,
  className,
}: {
  unit?: Unit;
  /** Max on the arc. Defaults to 200 km/h or 120 mph. */
  max?: number;
  compact?: boolean;
  className?: string;
}) {
  const [speed, setSpeed] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const emaRef = useRef<number | null>(null);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const mps =
          typeof pos.coords.speed === "number" && pos.coords.speed >= 0 ? pos.coords.speed : 0;
        // EMA smoothing
        const prev = emaRef.current ?? mps;
        const next = prev * 0.6 + mps * 0.4;
        emaRef.current = next;
        setSpeed(next);
        if (typeof pos.coords.heading === "number" && !Number.isNaN(pos.coords.heading)) {
          setHeading(pos.coords.heading);
        }
      },
      () => setSpeed(null),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 8000 },
    );
    return () => {
      if (watchRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchRef.current);
      }
    };
  }, []);

  const value = speed == null ? null : unit === "mph" ? speed * 2.23694 : speed * 3.6;
  const cap = max ?? (unit === "mph" ? 120 : 200);
  const pct = value == null ? 0 : Math.min(1, Math.max(0, value / cap));
  const label = unit === "mph" ? "MPH" : "KM/H";
  const size = compact ? 92 : 128;
  const stroke = compact ? 8 : 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const arc = c * 0.75; // 3/4 arc
  const dash = arc * pct;

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        padding: compact ? 8 : 10,
        borderRadius: 20,
        background: "hsl(var(--card) / 0.9)",
        backdropFilter: "blur(14px)",
        border: "1px solid hsl(var(--border))",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
      }}
    >
      <div style={{ position: "relative", width: size, height: size * 0.82 }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: "rotate(135deg)" }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={stroke}
            strokeDasharray={`${arc} ${c}`}
            strokeLinecap="round"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-neon, #7cff3f)"
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${c}`}
            strokeLinecap="round"
            style={{
              transition: "stroke-dasharray 220ms ease-out",
              filter: "drop-shadow(0 0 6px rgba(124,255,63,0.55))",
            }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          }}
        >
          <div style={{ textAlign: "center", lineHeight: 1 }}>
            <div
              style={{
                fontSize: compact ? 26 : 34,
                fontWeight: 800,
                color: "hsl(var(--foreground))",
              }}
            >
              {value == null ? "—" : Math.round(value)}
            </div>
            <div
              style={{
                fontSize: 9,
                letterSpacing: 1.4,
                color: "hsl(var(--muted-foreground))",
                marginTop: 2,
              }}
            >
              {label}
            </div>
          </div>
        </div>
      </div>
      {heading != null && !compact && (
        <div
          style={{
            fontSize: 9,
            letterSpacing: 1.4,
            color: "hsl(var(--muted-foreground))",
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          }}
        >
          HDG {Math.round(heading)}°
        </div>
      )}
    </div>
  );
}

export default SpeedoHUD;
