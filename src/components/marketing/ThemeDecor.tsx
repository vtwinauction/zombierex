/**
 * ZOMBIEREX marketing decor: fossilised dinosaur bone motifs fused with
 * machined automotive hardware (hex bolts, tyre tread, engine ribs).
 * Purely presentational — every element is aria-hidden.
 */

// Precomputed so server and client render byte-identical SVG paths.
const RIB_LENGTHS = [150, 178.78, 200.49, 212.68, 214.15, 204.14, 183.41, 153.19];

/** Curved rib-cage fossil, used as a faint background layer. */
export function FossilRibs({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`mkt-decor ${className}`}
      viewBox="0 0 400 520"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* spine */}
      <path
        d="M40 20 C 120 120, 150 260, 120 500"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.5"
      />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const y = 60 + i * 55;
        // Rounded so server and client render byte-identical SVG paths.
        const len = RIB_LENGTHS[i];

        return (
          <g key={i} opacity={0.42 - i * 0.015}>
            <path
              d={`M${70 + i * 7} ${y} C ${120 + i * 6} ${y - 26}, ${70 + len} ${y - 6}, ${90 + len} ${y + 40}`}
              stroke="currentColor"
              strokeWidth="3.4"
              strokeLinecap="round"
            />
            <circle cx={90 + len} cy={y + 40} r="5" fill="currentColor" />
          </g>
        );
      })}
    </svg>
  );
}

/** A long bone used as a section divider — knuckle joints at each end. */
export function BoneRule() {
  return (
    <div className="mkt-bone-rule" aria-hidden="true">
      <span className="mkt-bone-line" />
      <svg viewBox="0 0 120 28" fill="none" className="mkt-bone-svg">
        <path
          d="M18 8.5a6.5 6.5 0 1 0-5.6 10.2 6.5 6.5 0 1 0 10.6 4.2h74a6.5 6.5 0 1 0 10.6-4.2A6.5 6.5 0 1 0 102 8.5a6.5 6.5 0 1 0-10.4 4.6H23A6.5 6.5 0 1 0 18 8.5Z"
          fill="currentColor"
          fillOpacity="0.16"
          stroke="currentColor"
          strokeWidth="1.4"
        />
      </svg>
      <span className="mkt-bone-line" />
    </div>
  );
}

/** Machined hex bolt head — CNC hardware accent for card corners. */
export function HexBolt({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="mkt-bolt"
    >
      <path
        d="M12 2 21 7v10l-9 5-9-5V7l9-5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path
        d="M9.5 9.5h5M9.5 14.5h5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Tyre-tread strip, an automotive rule between blocks. */
export function TreadStrip() {
  return (
    <div className="mkt-tread" aria-hidden="true">
      {Array.from({ length: 28 }).map((_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}

/** Fossil claw + piston mark, a compact brand stamp. */
export function ClawPiston({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 19c4.5-.6 8.4-3.2 10.8-7.4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M14.8 11.6 20 4l1.4 4.6-3.1 4.6-3.5-1.6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.12"
      />
      <circle cx="5" cy="19" r="2.2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
