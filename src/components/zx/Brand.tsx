import type { ReactNode } from "react";
import brandLogo from "@/assets/zombierex-logo.png.asset.json";

/**
 * ZOMBIEREX brand lockups.
 * The mark is never distorted — treatments live in the frame around it.
 */

type Treatment = "plain" | "framed" | "scan" | "orbit";

export function BrandMark({
  size = 40,
  treatment = "plain",
  className = "",
}: {
  size?: number;
  treatment?: Treatment;
  className?: string;
}) {
  const img = (
    <img
      src={brandLogo.url}
      alt="ZOMBIEREX"
      width={size}
      height={size}
      className="relative z-10 h-full w-full object-contain"
      style={{
        filter: "drop-shadow(0 6px 14px color-mix(in oklab, var(--color-neon) 26%, transparent))",
      }}
    />
  );

  if (treatment === "plain") {
    return (
      <span className={className} style={{ width: size, height: size, display: "inline-block" }}>
        {img}
      </span>
    );
  }

  return (
    <span
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {treatment === "orbit" && (
        <>
          <span aria-hidden className="orbit-ring absolute" style={{ inset: -10 }} />
          <span
            aria-hidden
            className="absolute rounded-full"
            style={{ inset: -4, border: "1px solid var(--color-line-2)" }}
          />
        </>
      )}
      <span
        aria-hidden
        className={`notch absolute inset-0 ${treatment === "scan" ? "scanline" : ""}`}
        style={{
          background:
            "linear-gradient(180deg, var(--color-paper-0), var(--color-paper-2))",
          border: "1px solid var(--color-line-2)",
        }}
      />
      <span className="relative z-10 block" style={{ width: size * 0.68, height: size * 0.68 }}>
        {img}
      </span>
    </span>
  );
}

export function BrandLockup({
  size = 34,
  treatment = "framed",
  tagline,
  className = "",
}: {
  size?: number;
  treatment?: Treatment;
  tagline?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <BrandMark size={size} treatment={treatment} />
      <span className="flex flex-col leading-none">
        <span
          className="font-display font-bold uppercase"
          style={{ fontSize: size * 0.46, letterSpacing: "0.18em" }}
        >
          ZOMBIE<span style={{ color: "var(--color-neon)" }}>REX</span>
        </span>
        {tagline && (
          <span className="mono-tag mt-1" style={{ fontSize: 9 }}>
            {tagline}
          </span>
        )}
      </span>
    </span>
  );
}

/** Mission-control eyebrow used to head every section on the platform. */
export function MissionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mission-label">
      <span className="status-dot" />
      {children}
    </span>
  );
}

/** Small telemetry key/value readout. */
export function Readout({ k, v, tone }: { k: string; v: string | number; tone?: "signal" }) {
  return (
    <span className="inline-flex flex-col gap-0.5">
      <span className="mono-tag" style={{ fontSize: 9 }}>
        {k}
      </span>
      <span
        className="readout text-[13px] font-semibold"
        style={tone === "signal" ? { color: "var(--color-neon)" } : undefined}
      >
        {v}
      </span>
    </span>
  );
}

/** Machined instrument panel. */
export function TechPanel({
  children,
  className = "",
  bracketed = false,
}: {
  children: ReactNode;
  className?: string;
  bracketed?: boolean;
}) {
  return (
    <div className={`panel-tech ${bracketed ? "bracketed" : ""} ${className}`}>{children}</div>
  );
}
