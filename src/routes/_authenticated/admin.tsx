import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { adminStats } from "@/lib/admin.functions";

const statsQuery = queryOptions({ queryKey: ["admin-stats"], queryFn: () => adminStats() });

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin · ZOMBIEREX" }, { name: "robots", content: "noindex" }] }),
  loader: async ({ context }) => {
    try {
      return await context.queryClient.ensureQueryData(statsQuery);
    } catch (e: any) {
      // Non-admins get bounced back to home.
      if (String(e?.message ?? "").includes("Forbidden")) throw redirect({ to: "/" });
      throw e;
    }
  },
  component: AdminShell,
});

function AdminShell() {
  const { data: stats } = useSuspenseQuery(statsQuery);
  const path = useRouterState({ select: (s) => s.location.pathname });

  const tabs: { to: "/admin" | "/admin/vendors" | "/admin/crashes"; label: string; exact?: boolean }[] = [
    { to: "/admin", label: "Overview", exact: true },
    { to: "/admin/vendors", label: "Vendors" },
    { to: "/admin/crashes", label: "Crashes" },
  ];

  return (
    <div className="pb-24">
      <header className="px-5 pt-8">
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>◆ ADMIN CONSOLE</p>
        <h1 className="serif mt-2 text-4xl leading-tight" style={{ color: "var(--color-ink)" }}>
          Moderation <span className="italic" style={{ color: "var(--color-neon)" }}>bay</span>
        </h1>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <Stat k="Pending" v={stats.pending} hi />
          <Stat k="Approved" v={stats.approved} />
          <Stat k="Rejected" v={stats.rejected} />
          <Stat k="Active subs" v={stats.active_subscriptions} />
        </div>
      </header>

      <nav className="no-scrollbar mt-6 flex gap-2 overflow-x-auto px-5">
        {tabs.map((t) => {
          const active = t.exact ? path === t.to : path.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className="chip shrink-0"
              style={{
                background: active ? "var(--color-obsidian)" : "transparent",
                color: active ? "var(--color-neon)" : "var(--color-silver)",
                borderColor: active ? "var(--color-obsidian)" : "var(--color-hair-strong)",
              }}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4">
        <Outlet />
      </div>
    </div>
  );
}

function Stat({ k, v, hi }: { k: string; v: number; hi?: boolean }) {
  return (
    <div className="surface-1 lift-1 p-3" style={{ borderRadius: 8 }}>
      <p className="mono-tag" style={{ color: "var(--color-silver)" }}>{k}</p>
      <p className="serif mt-1 text-2xl italic" style={{ color: hi ? "var(--color-neon)" : "var(--color-ink)" }}>
        {v}
      </p>
    </div>
  );
}
