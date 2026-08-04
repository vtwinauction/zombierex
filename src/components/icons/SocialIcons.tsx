/**
 * ZOMBIEREX-native social action icons.
 *
 * Real-world object glyphs rendered in the ZombieRex green accent.
 * Each icon is built as a recognizable physical object so the feed
 * feels familiar, but the set is 100% custom-drawn and copyright-safe.
 *
 * - Uses currentColor so the parent drives the ZombieRex green tint + glow.
 * - Active states use solid fills rather than outline strokes.
 */

type IconProps = {
  size?: number;
  active?: boolean;
  className?: string;
};

const squareCap = { strokeLinecap: "square" as const, strokeLinejoin: "miter" as const };
const roundJoin = { strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

/** Like — realistic heart with an EKG/heartbeat line across it. Fills neon when active. */
export function HeartIcon({ size = 24, active = false, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 1.6 : 1.5}
      {...roundJoin}
    >
      {active ? (
        <g fill="currentColor" stroke="none">
          <path d="M12 21.35s-6.8-4.35-9.2-8.35C1.1 10.1 2.55 6 6.25 6c2.1 0 4.05 1.25 5.75 3.35C13.7 7.25 15.65 6 17.75 6 21.45 6 22.9 10.1 21.2 13c-2.4 4-9.2 8.35-9.2 8.35z" />
          <path
            d="M5 12.5l2.5-1.5 1.5 3 2.5-5 2 4 2-2.5 2.5 2"
            fill="none"
            stroke="var(--color-paper-0, #fff)"
            strokeWidth={1.4}
            opacity={0.85}
          />
        </g>
      ) : (
        <>
          <path d="M12 21.35s-6.8-4.35-9.2-8.35C1.1 10.1 2.55 6 6.25 6c2.1 0 4.05 1.25 5.75 3.35C13.7 7.25 15.65 6 17.75 6 21.45 6 22.9 10.1 21.2 13c-2.4 4-9.2 8.35-9.2 8.35z" />
          <path d="M5 12.5l2.5-1.5 1.5 3 2.5-5 2 4 2-2.5 2.5 2" strokeWidth={1.3} opacity={0.75} />
        </>
      )}
    </svg>
  );
}

/** Comment — realistic speech bubble with rounded tail. Fills when active. */
export function CommentIcon({ size = 24, active = false, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.5}
      {...roundJoin}
    >
      <path d="M20 10c0-2.8-2.2-5-5-5H9c-2.8 0-5 2.2-5 5v5c0 2.8 2.2 5 5 5h1.5l3.5 2.5 3.5-2.5H15c2.8 0 5-2.2 5-5v-5z" />
      {!active && (
        <>
          <circle cx="8.5" cy="12.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="12.5" r="1" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}

/** Views — realistic microscope silhouette. No active state. */
export function EyeIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      {...roundJoin}
    >
      {/* Base */}
      <path d="M5 19h14" />
      <path d="M7 19l1.5-4h7l1.5 4" />
      {/* Arm */}
      <path d="M10.5 15V9c0-1.1.9-2 2-2h0c1.1 0 2 .9 2 2v6" />
      {/* Stage */}
      <path d="M8 13h8" />
      {/* Eyepiece tube */}
      <path d="M13.5 7l2-3" />
      <path d="M15.5 4h2" />
      {/* Objective lens / lens barrel */}
      <path d="M11.5 11c0-1.1.9-2 2-2s2 .9 2 2" />
      <circle cx="12.5" cy="11" r="1.2" fill="currentColor" stroke="none" opacity={0.85} />
    </svg>
  );
}

/** Share — realistic handheld radio / walkie-talkie with antenna and speaker grille. Fills when active. */
export function ShareIcon({ size = 24, active = false, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      {...roundJoin}
    >
      <rect x="7" y="6" width="10" height="14" rx="1.5" fill={active ? "currentColor" : "none"} />
      <path d="M12 6V3" />
      <circle
        cx="12"
        cy="4.5"
        r="0.8"
        fill={active ? "var(--color-paper-0, #fff)" : "currentColor"}
        stroke="none"
      />
      {/* Speaker grille */}
      <circle
        cx="12"
        cy="10"
        r="2.2"
        fill="none"
        stroke={active ? "var(--color-paper-0, #fff)" : "currentColor"}
      />
      <circle
        cx="12"
        cy="10"
        r="0.8"
        fill={active ? "var(--color-paper-0, #fff)" : "currentColor"}
        stroke="none"
      />
      {/* Buttons */}
      <path
        d="M9 14.5h6M9 17h6"
        stroke={active ? "var(--color-paper-0, #fff)" : "currentColor"}
        strokeWidth={1.2}
      />
    </svg>
  );
}

/** Save — realistic 3.5" floppy disk with metal shutter and label window. Fills solid when active. */
export function BookmarkIcon({ size = 24, active = false, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      {...roundJoin}
    >
      <path
        d="M5 4.5A1.5 1.5 0 016.5 3h11A1.5 1.5 0 0119 4.5v15a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 015 19.5v-15z"
        fill={active ? "currentColor" : "none"}
      />
      {/* Metal shutter */}
      <path
        d="M7 3h6v4a1 1 0 01-1 1H8a1 1 0 01-1-1V3z"
        fill={active ? "var(--color-paper-0, #fff)" : "none"}
        stroke={active ? "var(--color-paper-0, #fff)" : "currentColor"}
        opacity={active ? 0.9 : 1}
      />
      {/* Label window */}
      <path
        d="M7 10h10v7a1 1 0 01-1 1H8a1 1 0 01-1-1v-7z"
        fill={active ? "var(--color-paper-0, #fff)" : "none"}
        stroke={active ? "var(--color-paper-0, #fff)" : "currentColor"}
        opacity={active ? 0.85 : 1}
      />
      {/* Label lines */}
      {!active && (
        <>
          <path d="M8.5 12h7" strokeWidth={1} opacity={0.7} />
          <path d="M8.5 14.5h5" strokeWidth={1} opacity={0.5} />
        </>
      )}
    </svg>
  );
}
