import { Link, useRouterState } from "@tanstack/react-router";
import type { ComponentType } from "react";
import { Home, Search, Play, User } from "lucide-react";

type NavItem = {
  to: "/" | "/search" | "/reels" | "/profile";
  label: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
};

const ITEMS: (NavItem | "center")[] = [
  { to: "/",       label: "Home",    icon: Home },
  { to: "/search", label: "Search",  icon: Search },
  "center",
  { to: "/reels",  label: "Reels",   icon: Play },
  { to: "/profile", label: "Profile", icon: User },
];

/**
 * 5-column bottom nav. Equal-width slots for Home, Search, Atlas, Reels,
 * Profile. Center slot holds the elevated ZombieRex compass → Route Atlas.
 */
export function BottomNav({ hidden = false }: { hidden?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
      style={{
        transform: hidden ? "translateY(100%)" : "translateY(0)",
        background: "color-mix(in oklab, #ffffff 94%, transparent)",
        backdropFilter: "blur(22px) saturate(170%)",
        borderTop: "1px solid var(--color-line)",
        paddingBottom: "env(safe-area-inset-bottom)",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.04)",
      }}
    >
      <div className="mx-auto grid max-w-md grid-cols-5 items-end px-1 pt-1 pb-[calc(0.375rem+env(safe-area-inset-bottom))]">
        {ITEMS.map((it, i) =>
          it === "center" ? (
            <CenterAtlas key="center" />
          ) : (
            <NavCell
              key={it.to}
              item={it}
              active={isActive(pathname, it.to)}
            />
          )
        )}
      </div>
    </nav>
  );
}

function isActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname.startsWith(to);
}

function NavCell({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className="tap group relative flex flex-col items-center justify-end gap-1 py-2"
      style={{ color: active ? "var(--color-ink-0)" : "var(--color-ink-3)" }}
    >
      <Icon
        className="h-[22px] w-[22px] transition-all duration-200"
        strokeWidth={active ? 2.25 : 1.7}
        style={{
          filter: active ? "drop-shadow(0 1px 1px rgba(0,0,0,0.08))" : "none",
        }}
      />
      <span
        className="text-[10px] font-semibold leading-none transition-colors duration-200"
        style={{ letterSpacing: "-0.01em" }}
      >
        {item.label}
      </span>
      <span
        className="absolute bottom-1 h-[4px] rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{
          width: active ? "20px" : "0px",
          opacity: active ? 1 : 0,
          background: active ? "var(--color-neon, #00c853)" : "transparent",
          boxShadow: active ? "0 0 8px rgba(0,200,83,0.45)" : "none",
        }}
      />
    </Link>
  );
}

function CenterAtlas() {
  return (
    <div className="relative flex items-end justify-center pb-1">
      <Link
        to="/atlas"
        aria-label="Open Route Atlas"
        className="tap relative grid h-13 w-13 -translate-y-1 place-items-center transition-transform duration-200 active:scale-95"
        style={{
          borderRadius: 999,
          background: "radial-gradient(circle at 30% 25%, #172114 0%, #0a0f08 70%)",
          color: "var(--color-neon, #00c853)",
          boxShadow:
            "0 0 0 1.5px rgba(0,200,83,0.45), 0 0 18px rgba(0,200,83,0.35), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -6px 14px rgba(0,0,0,0.55)",
        }}
      >
        <CompassMark />
      </Link>
    </div>
  );
}

/**
 * Old-school compass mark — bezel + cardinal ticks + N/S needle, all rendered
 * in the ZombieRex neon-green palette. Used as the elevated center button.
 */
function CompassMark() {
  const NEON = "var(--color-neon, #00c853)";
  const DIM = "rgba(0,200,83,0.55)";
  const ticks = Array.from({ length: 24 }, (_, i) => i * 15);
  return (
    <svg
      width={28}
      height={28}
      viewBox="0 0 48 48"
      aria-hidden="true"
      style={{ filter: "drop-shadow(0 0 4px rgba(0,200,83,0.55))" }}
    >
      {/* outer bezel */}
      <circle cx="24" cy="24" r="22" fill="none" stroke={NEON} strokeWidth="1.2" />
      <circle cx="24" cy="24" r="18.5" fill="none" stroke={DIM} strokeWidth="0.6" />

      {/* tick ring */}
      <g stroke={DIM} strokeLinecap="round">
        {ticks.map((deg) => {
          const cardinal = deg % 90 === 0;
          const len = cardinal ? 3.2 : 1.6;
          const sw = cardinal ? 1.2 : 0.6;
          return (
            <line
              key={deg}
              x1="24"
              y1={4.5}
              x2="24"
              y2={4.5 + len}
              strokeWidth={sw}
              stroke={cardinal ? NEON : DIM}
              transform={`rotate(${deg} 24 24)`}
            />
          );
        })}
      </g>

      {/* cardinal letters */}
      <g fill={NEON} style={{ font: "bold 5px ui-sans-serif, system-ui" }} textAnchor="middle">
        <text x="24" y="12.2">N</text>
        <text x="24" y="39.6">S</text>
        <text x="36.4" y="25.9">E</text>
        <text x="11.6" y="25.9">W</text>
      </g>

      {/* needle — north bright, south dim (old-school two-tone) */}
      <g transform="rotate(-8 24 24)">
        <polygon points="24,10 21.6,24 26.4,24" fill={NEON} />
        <polygon points="24,38 21.6,24 26.4,24" fill="rgba(0,200,83,0.28)" stroke={DIM} strokeWidth="0.4" />
      </g>

      {/* pivot cap */}
      <circle cx="24" cy="24" r="2" fill="#0a0f08" stroke={NEON} strokeWidth="1" />
      <circle cx="24" cy="24" r="0.7" fill={NEON} />
    </svg>
  );
}
