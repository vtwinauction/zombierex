import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { checkFinanceAccess } from "@/lib/finance.functions";

export const Route = createFileRoute("/_authenticated/owner/finance")({
  head: () => ({
    meta: [
      { title: "Revenue Control · ZOMBIEREX" },
      {
        name: "description",
        content: "Commission engine, settlements, payouts and platform revenue analytics.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Revenue Control · ZOMBIEREX" },
      { property: "og:description", content: "Platform commission and settlement control plane." },
    ],
  }),
  component: FinanceShell,
});

const TABS = [
  { to: "/owner/finance", label: "OVERVIEW", exact: true },
  { to: "/owner/finance/commissions", label: "COMMISSIONS" },
  { to: "/owner/finance/transactions", label: "TRANSACTIONS" },
  { to: "/owner/finance/payments", label: "GATEWAY" },
  { to: "/owner/finance/sellers", label: "SELLERS" },
  { to: "/owner/finance/buyers", label: "BUYERS" },
  { to: "/owner/finance/payouts", label: "PAYOUTS" },
  { to: "/owner/finance/audit", label: "AUDIT" },
] as const;

function FinanceShell() {
  const check = useServerFn(checkFinanceAccess);
  const gate = useQuery({
    queryKey: ["finance", "access"],
    queryFn: () => check({ data: undefined as any }),
    retry: false,
  });

  if (gate.isLoading) return <div className="p-6 text-sm opacity-60">Verifying clearance…</div>;
  if (!gate.data?.canRead) {
    return (
      <div className="p-8 text-center">
        <p className="mono-tag" style={{ color: "var(--color-heat)" }}>
          ERR·403
        </p>
        <h1 className="display-xl mt-2 text-2xl">FINANCE CLEARANCE REQUIRED</h1>
        <Link to="/" className="btn-ghost mt-6 inline-flex">
          Return home
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-28">
      <div className="border-b px-5 py-4" style={{ borderColor: "var(--color-hair)" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="mono-tag" style={{ color: "#00c853" }}>
              ROOT · TREASURY
            </p>
            <h1 className="display-xl text-xl">Revenue Control</h1>
          </div>
          <Link to="/owner" className="btn-ghost text-xs">
            ← Owner
          </Link>
        </div>
        <nav className="mt-3 -mx-1 flex gap-1 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              activeOptions={{ exact: (t as any).exact ?? false }}
              className="mono-tag whitespace-nowrap rounded px-3 py-1.5 text-[10px]"
              activeProps={{ style: { background: "rgba(0,200,83,0.14)", color: "#00c853" } }}
              inactiveProps={{
                style: { color: "var(--color-silver)", border: "1px solid var(--color-hair)" },
              }}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        {!gate.data.canWrite && (
          <p className="mt-2 text-[11px]" style={{ color: "var(--color-silver)" }}>
            Read-only access — financial changes require owner clearance.
          </p>
        )}
      </div>
      <Outlet />
    </div>
  );
}
