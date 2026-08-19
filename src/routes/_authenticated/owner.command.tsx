import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ChevronDown, Menu, ShieldCheck, X } from "lucide-react";
import { getMyClearance } from "@/lib/command.functions";
import { Button } from "@/components/ui/button";

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
  const navigate = useNavigate({ from: "/owner/command" });
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
  const items = groups.flatMap((group) => group.items);
  const activeItem =
    items.find((item) => (item.exact ? path === item.to : path.startsWith(item.to))) ?? items[0];

  return (
    <div className="pb-28 lg:flex lg:min-h-svh lg:gap-0">
      {/* Sidebar — fixed instrument rail on desktop, slide-over directory on mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto p-4 transition-transform lg:sticky lg:top-0 lg:h-svh lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: "var(--color-paper-1)",
          borderRight: "1px solid var(--color-hair)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="mono-tag truncate" style={{ color: "var(--color-neon)" }}>
              ◆ ZOMBIEREX · SITE B
            </p>
            <h1 className="text-lg font-semibold leading-tight">Mission Control</h1>
          </div>
          <Button variant="ghost" size="icon" className="min-h-11 min-w-11 lg:hidden" aria-label="Close navigation" onClick={() => setOpen(false)}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="mt-3 flex items-center gap-2 border-y py-2" style={{ borderColor: "var(--color-hair)" }}>
          <ShieldCheck className="size-4 shrink-0" style={{ color: "var(--color-neon)" }} />
          <div className="min-w-0">
            <p className="mono-tag truncate" style={{ color: "var(--color-silver)" }}>PARK CLEARANCE</p>
            <p className="truncate text-xs font-semibold">{q.data.isOwner ? "SUPER ADMIN" : (q.data.label ?? "ADMIN")}</p>
          </div>
        </div>

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
                      className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded px-3 py-2.5 text-[13px]"
                      style={{
                        background: active ? "rgba(0,200,83,0.12)" : "transparent",
                        color: active ? "var(--color-neon)" : "var(--color-ink)",
                      }}
                    >
                      <span aria-hidden className="size-1.5 rounded-full" style={{ background: active ? "var(--color-neon)" : "var(--color-hair-strong)" }} />
                      <span className="truncate">{i.label}</span>
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
          className="sticky top-0 z-20 border-b backdrop-blur"
          style={{
            borderColor: "var(--color-hair)",
            background: "color-mix(in srgb, var(--color-paper-1) 90%, transparent)",
          }}
        >
          <div aria-hidden className="h-0.5 bg-gradient-to-r from-primary via-accent to-transparent" />
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 lg:flex lg:px-6">
            <div className="min-w-0 lg:hidden">
              <p className="mono-tag truncate" style={{ color: "var(--color-neon)" }}>◆ PARK OPERATIONS · LIVE</p>
              <p className="truncate text-base font-semibold">Mission Control</p>
            </div>
            <Button variant="ghost" size="icon" className="min-h-11 min-w-11 lg:hidden" aria-label="Open navigation" onClick={() => setOpen(true)}>
              <Menu className="size-5" />
            </Button>
            <Link to="/owner/command/search" className="mono-tag hidden min-w-0 flex-1 truncate text-[11px] lg:block">
              ⌕ SEARCH EVERYTHING — users, businesses, orders, invoices, campaigns
            </Link>
            <span className="mono-tag hidden shrink-0 items-center gap-2 text-[10px] lg:flex" style={{ color: "var(--color-neon)" }}>
              <span className="size-1.5 rounded-full bg-primary" /> SYSTEMS NOMINAL
            </span>
          </div>

          <div className="relative px-3 pb-3 lg:hidden">
            <select
              aria-label="Select Mission Control module"
              value={activeItem?.to ?? "/owner/command"}
              onChange={(event) => navigate({ to: event.target.value })}
              className="mono-tag min-h-11 w-full appearance-none rounded-md border bg-background px-3 pr-10 text-xs font-semibold text-foreground"
            >
              {groups.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.items.map((item) => <option key={item.to} value={item.to}>{item.label}</option>)}
                </optgroup>
              ))}
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute right-6 top-3.5 size-4 text-muted-foreground" />
          </div>
        </header>
        <div className="px-4 py-5 lg:px-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
