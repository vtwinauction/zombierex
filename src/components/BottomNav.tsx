import { Link, useRouterState } from "@tanstack/react-router";
import type { ComponentType } from "react";
import { Home, Search, Play, ShoppingCart, User } from "lucide-react";
import { useEffect, useState } from "react";

type NavItem = {
  to: "/" | "/search" | "/reels" | "/cart" | "/profile";
  label: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
};

const LEFT: NavItem[] = [
  { to: "/",       label: "Home",   icon: Home },
  { to: "/search", label: "Search", icon: Search },
];
const RIGHT: NavItem[] = [
  { to: "/reels",   label: "Reels",   icon: Play },
  { to: "/cart",    label: "Cart",    icon: ShoppingCart },
  { to: "/profile", label: "Profile", icon: User },
];

/**
 * 5-tab bottom nav. Center Create button is a green old-school compose
 * (nib pen) that routes to Route Atlas POIs — riders can log a new pin
 * (hotel / resto / scenic spot) from anywhere in the app.
 * Post / photo / video composition lives in the top nav (+ icon).
 */
export function BottomNav({ hidden = false }: { hidden?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
      style={{
        transform: hidden ? "translateY(100%)" : "translateY(0)",
        background: "color-mix(in oklab, #ffffff 92%, transparent)",
        backdropFilter: "blur(20px) saturate(160%)",
        borderTop: "1px solid var(--color-line)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="relative mx-auto flex max-w-md items-center justify-between px-2 pt-1.5 pb-1.5">
        <div className="flex items-center gap-1">
          {LEFT.map((it) => <NavCell key={it.to} item={it} active={isActive(pathname, it.to)} />)}
        </div>

        {/* Center — old-school compass, neon-green ZombieRex → Atlas */}
        <Link
          to="/atlas"
          aria-label="Open Route Atlas"
          className="tap absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center"
          style={{
            borderRadius: 999,
            background: "radial-gradient(circle at 30% 25%, #172114 0%, #0a0f08 70%)",
            color: "var(--color-neon, #7cff3f)",
            boxShadow:
              "0 0 0 1px rgba(124,255,63,0.45), 0 0 14px rgba(124,255,63,0.35), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -6px 12px rgba(0,0,0,0.6)",
          }}
        >
          <CompassMark />
        </Link>

        <div className="flex items-center gap-1">
          {RIGHT.map((it) =>
            it.to === "/cart" ? (
              <CartCell key={it.to} item={it} active={isActive(pathname, it.to)} />
            ) : (
              <NavCell key={it.to} item={it} active={isActive(pathname, it.to)} />
            )
          )}
        </div>
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
      className="tap relative flex flex-col items-center justify-center gap-0.5 py-1.5"
      style={{ color: active ? "var(--color-ink-0)" : "var(--color-ink-3)" }}
    >
      <Icon
        className="h-[22px] w-[22px]"
        strokeWidth={active ? 2.2 : 1.75}
      />
      <span
        className="text-[10px] font-medium leading-none"
        style={{ letterSpacing: "-0.01em" }}
      >
        {item.label}
      </span>
      <span
        className="absolute -bottom-1 h-[3px] rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{
          width: active ? "22px" : "0px",
          opacity: active ? 1 : 0,
          background: "var(--color-ink-0)",
        }}
      />
    </Link>
  );
}

const CART_KEY = "zx.cart.v1";

function CartCell({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  const [count, setCount] = useState(0);

  useEffect(() => {
    const read = () => {
      try {
        const ids = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
        setCount(Array.isArray(ids) ? ids.length : 0);
      } catch {
        setCount(0);
      }
    };
    read();
    window.addEventListener("storage", read);
    const id = setInterval(read, 500);
    return () => {
      window.removeEventListener("storage", read);
      clearInterval(id);
    };
  }, []);

  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className="tap relative flex flex-col items-center justify-center gap-0.5 py-1.5"
      style={{ color: active ? "var(--color-ink-0)" : "var(--color-ink-3)" }}
    >
      <span className="relative">
        <Icon
          className="h-[22px] w-[22px]"
          strokeWidth={active ? 2.2 : 1.75}
        />
        {count > 0 && (
          <span
            className="absolute -right-2 -top-1.5 grid h-4 min-w-[16px] place-items-center rounded-full px-1 text-[9px] font-bold"
            style={{ background: "var(--color-neon)", color: "var(--color-ink-0)" }}
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </span>
      <span
        className="text-[10px] font-medium leading-none"
        style={{ letterSpacing: "-0.01em" }}
      >
        {item.label}
      </span>
      <span
        className="absolute -bottom-1 h-[3px] rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{
          width: active ? "22px" : "0px",
          opacity: active ? 1 : 0,
          background: "var(--color-ink-0)",
        }}
      />
    </Link>
  );
}

/**
 * Old-school compass mark — bezel + cardinal ticks + N/S needle, all rendered
 * in the ZombieRex neon-green palette. Used as the elevated center button.
 */
function CompassMark() {
  const NEON = "var(--color-neon, #7cff3f)";
  const DIM = "rgba(124,255,63,0.55)";
  const ticks = Array.from({ length: 24 }, (_, i) => i * 15);
  return (
    <svg
      width={30}
      height={30}
      viewBox="0 0 48 48"
      aria-hidden="true"
      style={{ filter: "drop-shadow(0 0 4px rgba(124,255,63,0.55))" }}
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
        <polygon points="24,38 21.6,24 26.4,24" fill="rgba(124,255,63,0.28)" stroke={DIM} strokeWidth="0.4" />
      </g>

      {/* pivot cap */}
      <circle cx="24" cy="24" r="2" fill="#0a0f08" stroke={NEON} strokeWidth="1" />
      <circle cx="24" cy="24" r="0.7" fill={NEON} />
    </svg>
  );
}
