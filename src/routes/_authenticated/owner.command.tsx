import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getMyClearance } from "@/lib/command.functions";

export const Route = createFileRoute("/_authenticated/owner/command")({
  head: () => ({
    meta: [
      { title: "Mission Control · ZOMBIEREX" },
      {
        name: "description",
        content: "ZOMBIEREX Super Admin Command Center — ERP, CRM, finance, advertising and platform control.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Mission Control · ZOMBIEREX" },
      { property: "og:description", content: "Super Admin command center for the ZOMBIEREX platform." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CommandShell,
});

type NavItem = { to: string; label: string; scope: string; exact?: boolean };
type NavGroup = { group: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    group: "COMMAND CENTER",
    items: [{ to: "/owner/command", label: "Overview", scope: "overview", exact: true }],
  },
  {
    group: "PEOPLE",
    items: [
      { to: "/owner/command/users", label: "Users", scope: "users" },
      { to: "/owner/command/businesses", label: "Businesses", scope: "businesses" },
    ],
  },
  {
    group: "REVENUE",
    items: [
      { to: "/owner/command/finance", label: "Finance & Invoices", scope: "finance" },
      { to: "/owner/command/ads", label: "Advertising", scope: "ads" },
    ],
  },
  {
    group: "OPERATIONS",
    items: [
      { to: "/owner/command/crm", label: "CRM & Support", scope: "crm" },
      { to: "/owner/command/erp", label: "ERP & Inventory", scope: "erp" },
      { to: "/owner/command/content", label: "Content", scope: "content" },
      { to: "/owner/command/moderation", label: "Moderation", scope: "moderation" },
    ],
  },
  {
    group: "SYSTEM",
    items: [{ to: "/owner/command/system", label: "Roles · Audit · Health", scope: "system" }],
  },
];

function CommandShell() {
  const fn = useServerFn(getMyClearance);
  const q = useQuery({
    queryKey: ["command", "clearance"],
    queryFn: () => fn({ data: undefined as never }),
    retry: false,
    staleTime: 60_000,
  });
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  if (q.isLoading) {
    return <div className="p-8 text-sm opacity-60">Verifying clearance…</div>;
  }

  const scopes: string[] = q.data?.scopes ?? [];
  const can = (s: string) => scopes.includes("*") || scopes.includes(s);

  if (!q.data?.hasAny) {
    return (
      <div className="p-10 text-center">
        <p className="mono-tag" style={{ color: "var(--color-heat)" }}>
          ERR · 403
        </p>
        <h1 className="mt-2 text-2xl">COMMAND CLEARANCE REQUIRED</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--color-silver)" }}>
          Your account has no administrator scopes.
        </p>
        <Link to="/" className="btn-ghost mt-6 inline-flex">
          Return home
        </Link>
      </div>
    );
  }

  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => can(i.scope)) })).filter(
    (g) => g.items.length,
  );

  return (
    <div className="pb-28 lg:flex lg:min-h-svh lg:gap-0">
      {/* Sidebar — rail on desktop, sheet on mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto p-4 transition-transform lg:sticky lg:top-0 lg:h-svh lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: "var(--color-paper-1, #fafafa)",
          borderRight: "1px solid var(--color-hair)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="mono-tag" style={{ color: "var(--color-neon)" }}>
              ◆ ZOMBIEREX
            </p>
            <h1 className="text-lg font-semibold leading-tight">Mission Control</h1>
          </div>
          <button className="btn-ghost text-xs lg:hidden" onClick={() => setOpen(false)}>
            ✕
          </button>
        </div>
        <p className="mono-tag mt-2" style={{ color: "var(--color-silver)" }}>
          {q.data.isOwner ? "SUPER ADMIN" : (q.data.label ?? "ADMIN")}
        </p>

        <nav className="mt-5 space-y-5">
          {groups.map((g) => (
            <div key={g.group}>
              <p className="mono-tag text-[10px]" style={{ color: "var(--color-silver)" }}>
                {g.group}
              </p>
              <div className="mt-1.5 space-y-1">
                {g.items.map((i) => {
                  const active = i.exact ? path === i.to : path.startsWith(i.to);
                  return (
                    <Link
                      key={i.to}
                      to={i.to}
                      onClick={() => setOpen(false)}
                      className="block rounded px-3 py-2 text-[13px]"
                      style={{
                        background: active ? "rgba(0,200,83,0.12)" : "transparent",
                        color: active ? "var(--color-neon)" : "var(--color-ink)",
                      }}
                    >
                      {i.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <Link to="/owner" className="btn-ghost mt-6 inline-flex text-xs">
          ← Owner console
        </Link>
      </aside>

      {open && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 lg:hidden"
          style={{ background: "rgba(0,0,0,0.35)" }}
          onClick={() => setOpen(false)}
        />
      )}

      <main className="min-w-0 flex-1">
        <header
          className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 backdrop-blur lg:px-6"
          style={{
            borderBottom: "1px solid var(--color-hair)",
            background: "color-mix(in srgb, var(--color-paper-1, #fafafa) 88%, transparent)",
          }}
        >
          <button className="btn-ghost text-xs lg:hidden" onClick={() => setOpen(true)}>
            ☰
          </button>
          <Link to="/owner/command/search" className="mono-tag text-[11px] flex-1 truncate">
            ⌕ SEARCH EVERYTHING — users, businesses, orders, invoices, campaigns
          </Link>
        </header>
        <div className="px-4 py-5 lg:px-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
