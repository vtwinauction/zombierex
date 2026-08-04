import type { SVGProps } from "react";

/**
 * ZOMBIEREX custom icon family.
 * All icons are hand-crafted SVG glyphs inspired by fossils, claws, bones,
 * CNC parts, engine components and motorcycle frames.
 *
 * Contract:
 *   - use `currentColor` for stroke/fill so parent controls color
 *   - default size 22, controlled via className (h-* w-*) or size prop
 *   - stroke-based lines with strokeLinecap "square" for a machined feel
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({
  children,
  size = 22,
  strokeWidth = 1.6,
  ...rest
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      strokeLinejoin="miter"
      {...rest}
    >
      {children}
    </svg>
  );
}

/* ─── PRIMARY NAV ──────────────────────────────────────────────── */

// GARAGE — chevron roof + roller door lines (workshop)
export const IconGarage = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 11 12 4l9 7" />
    <path d="M5 11v9h14v-9" />
    <path d="M5 14h14M5 17h14" strokeWidth={1.1} />
  </Base>
);

// DISCOVER — fossil compass: chambered spiral (ammonite meets radar)
export const IconDiscover = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 12 15.5 8.5M12 12l-4.5 4.5" />
    <path d="M12 12a4 4 0 013.5 5.5" strokeWidth={1.2} />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </Base>
);

// MARKETPLACE — machined shopfront: bay door + bolts
export const IconMarket = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 9l2-4h14l2 4" />
    <path d="M4 9v11h16V9" />
    <path d="M9 20v-6h6v6" />
    <circle cx="6.5" cy="11.5" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="17.5" cy="11.5" r="0.6" fill="currentColor" stroke="none" />
  </Base>
);

// RIDER HELMET — profile helmet with visor slit
export const IconHelmet = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 14a8 8 0 0116 0v4a1 1 0 01-1 1H5a1 1 0 01-1-1z" />
    <path d="M4 14h16" strokeWidth={1.1} />
    <path d="M7 11h7" strokeWidth={2} />
  </Base>
);

/* ─── POST ACTIONS ────────────────────────────────────────────── */

// LIKE — claw mark (three parallel slashes with curve)
export const IconClaw = (p: IconProps) => (
  <Base {...p} strokeWidth={2}>
    <path d="M6 20c1-6 3-11 6-14" strokeLinecap="round" />
    <path d="M10 21c1-6 3-11 6-14" strokeLinecap="round" />
    <path d="M14 22c1-6 3-11 6-14" strokeLinecap="round" />
  </Base>
);

// COMMENT — helmet visor speech bubble (gauge/speech hybrid)
export const IconVisor = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 7a3 3 0 013-3h10a3 3 0 013 3v6a3 3 0 01-3 3h-5l-4 3v-3H7a3 3 0 01-3-3z" />
    <path d="M7 10h10" strokeWidth={2} />
  </Base>
);

// SHARE — mechanical claw / grapple (three-prong)
export const IconMechClaw = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3v7" />
    <path d="M7 7l5 3 5-3" />
    <path d="M12 10v11" strokeWidth={2} />
    <path d="M8 18l4 3 4-3" />
    <circle cx="12" cy="10" r="1.6" fill="currentColor" stroke="none" />
  </Base>
);

// SAVE — bone-shaped bookmark
export const IconBoneMark = (p: IconProps) => (
  <Base {...p}>
    <path d="M8 3.5a2 2 0 10-2 3.2v10.8a1 1 0 001.6.8L12 15l4.4 3.3a1 1 0 001.6-.8V6.7A2 2 0 1016 3.5a2 2 0 00-4 0 2 2 0 00-4 0z" />
  </Base>
);

/* ─── SYSTEM / HEADER ─────────────────────────────────────────── */

// NOTIFICATIONS — engine pulse / piston with heat marks
export const IconEnginePulse = (p: IconProps) => (
  <Base {...p}>
    <rect x="8" y="4" width="8" height="12" rx="1" />
    <path d="M10 4V2M14 4V2" strokeWidth={1.2} />
    <path d="M8 16l-2 5M16 16l2 5M12 16v6" strokeWidth={1.2} />
  </Base>
);

// MESSAGES — gauge/tach speech
export const IconGauge = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 13a9 9 0 1118 0v3a2 2 0 01-2 2h-5l-3 3v-3H5a2 2 0 01-2-2z" />
    <path d="M12 13l3.5-3.5" strokeWidth={2} strokeLinecap="round" />
    <circle cx="12" cy="13" r="1.2" fill="currentColor" stroke="none" />
  </Base>
);

// SEARCH — fossil lens (segmented ring + handle)
export const IconLens = (p: IconProps) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="6" />
    <path d="M11 5v2M17 11h-2M11 17v-2M5 11h2" strokeWidth={1.1} />
    <path d="M15.5 15.5L21 21" strokeWidth={2} strokeLinecap="round" />
  </Base>
);

// PLUS / CREATE — bolt cross (four-way CNC bolt)
export const IconBoltCross = (p: IconProps) => (
  <Base {...p} strokeWidth={2}>
    <path d="M12 4v16M4 12h16" />
    <circle cx="12" cy="12" r="3.4" strokeWidth={1.2} />
  </Base>
);

// PLAY — piston triangle
export const IconIgnite = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 4l12 8-12 8V4z" fill="currentColor" />
  </Base>
);

// SETTINGS — sprocket
export const IconSprocket = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3l1.4 2 2.4-.4.4 2.4L18 8.6l-1.4 2 1.4 2-1.8 1.6-.4 2.4-2.4-.4L12 21l-1.4-2-2.4.4-.4-2.4L6 15.4l1.4-2L6 11.4l1.8-1.6.4-2.4 2.4.4z" />
    <circle cx="12" cy="12" r="2.6" />
  </Base>
);
