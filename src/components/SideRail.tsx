import { Link, useRouterState } from "@tanstack/react-router";

const NAV = [
  { to: "/", code: "01", label: "DECK", glyph: "▣" },
  { to: "/events", code: "02", label: "MISN", glyph: "◇" },
  { to: "/search", code: "03", label: "SCAN", glyph: "◎" },
  { to: "/marketplace", code: "04", label: "ARSN", glyph: "⌘" },
  { to: "/cart", code: "05", label: "CART", glyph: "◫" },
  { to: "/messages", code: "06", label: "COMM", glyph: "≋" },
  { to: "/notifications", code: "07", label: "SIGL", glyph: "◈" },
  { to: "/profile", code: "08", label: "PROF", glyph: "⬢" },
] as const;

export function SideRail() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      aria-label="Primary"
      className="fixed left-0 top-0 z-40 flex h-full w-12 flex-col items-stretch justify-between border-r border-ink bg-ink text-bone"
    >
      <div className="flex flex-col items-center py-3">
        <div className="clip-chamfer-sm mb-3 flex h-8 w-8 items-center justify-center border border-bone bg-signal text-ink">
          <span className="font-display text-[13px] font-bold leading-none">ZX</span>
        </div>
        <div className="rule-tick-v h-8 opacity-40" />
      </div>

      <ul className="flex-1 space-y-0.5 py-1">
        {NAV.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={`tap relative flex flex-col items-center gap-0.5 py-3 ${active ? "text-signal" : "text-bone/70"}`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 bg-signal" />
                )}
                <span className="text-lg leading-none">{item.glyph}</span>
                <span className="mono-caps text-[8px]">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col items-center gap-1 py-3">
        <span className="mono-num text-signal text-[9px]">v1.0</span>
        <span className="signal-pulse block h-1.5 w-1.5 bg-signal" />
      </div>
    </nav>
  );
}
