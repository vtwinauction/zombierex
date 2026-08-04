import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  adminHealthSnapshot,
  adminSetMaintenance,
  adminSetFeatureFlag,
  listFeatureFlags,
} from "@/lib/ops.functions";

export const Route = createFileRoute("/_authenticated/admin/health")({
  head: () => ({
    meta: [
      { title: "Admin Health · ZOMBIEREX" },
      { name: "description", content: "System health checks and platform diagnostics." },
      { property: "og:title", content: "Admin Health · ZOMBIEREX" },
      { property: "og:description", content: "System health checks and platform diagnostics." },
    ],
  }),
  component: HealthPage,
});

function HealthPage() {
  const qc = useQueryClient();
  const healthFn = useServerFn(adminHealthSnapshot);
  const maintFn = useServerFn(adminSetMaintenance);
  const setFlagFn = useServerFn(adminSetFeatureFlag);
  const flagsFn = useServerFn(listFeatureFlags);

  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => healthFn(),
    refetchInterval: 30_000,
  });
  const flags = useQuery({ queryKey: ["flags"], queryFn: () => flagsFn() });

  const maintenance = useMutation({
    mutationFn: (vars: { enabled: boolean; message?: string }) => maintFn({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["health"] }),
  });
  const toggleFlag = useMutation({
    mutationFn: (vars: { key: string; enabled: boolean }) => setFlagFn({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flags"] }),
  });

  const maint = health.data?.settings?.maintenance_mode as
    | { enabled?: boolean; message?: string }
    | undefined;

  return (
    <div
      style={{
        background: "var(--color-cream, #fafaf7)",
        minHeight: "100vh",
        color: "var(--color-ink, #0a0a0a)",
      }}
    >
      <main className="mx-auto max-w-3xl px-4 pb-32 pt-4">
        <h1 className="text-2xl font-bold mb-4">Platform Health</h1>

        <section className="mb-6">
          <div className="grid grid-cols-2 gap-2">
            {health.data &&
              Object.entries(health.data.counts).map(([k, v]) => (
                <div
                  key={k}
                  className="p-3"
                  style={{ background: "var(--color-graphite, #eee)", borderRadius: 12 }}
                >
                  <p className="text-xs opacity-70 uppercase">{k.replace(/_/g, " ")}</p>
                  <p className="text-2xl font-bold">{String(v)}</p>
                </div>
              ))}
          </div>
          <p className="text-xs opacity-60 mt-2">
            Snapshot at {health.data ? new Date(health.data.generated_at).toLocaleString() : "…"} ·
            auto-refresh 30 s
          </p>
        </section>

        <section
          className="mb-6 p-4"
          style={{
            background: "white",
            border: "1px solid var(--color-hair, #ddd)",
            borderRadius: 12,
          }}
        >
          <h2 className="font-bold mb-2">Maintenance mode</h2>
          <p className="text-sm opacity-70 mb-3">
            When on, non-admin visitors see a maintenance banner. Server APIs stay online.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() =>
                maintenance.mutate({ enabled: !maint?.enabled, message: maint?.message })
              }
              className="px-3 py-2 text-sm"
              style={{
                background: maint?.enabled ? "#ef4444" : "var(--color-neon, #00ff88)",
                color: "var(--color-ink, #0a0a0a)",
                borderRadius: 8,
                fontWeight: 600,
              }}
            >
              {maint?.enabled ? "Turn OFF maintenance" : "Turn ON maintenance"}
            </button>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="font-bold mb-2">Feature flags</h2>
          <div className="space-y-2">
            {flags.data?.map((f: any) => (
              <div
                key={f.key}
                className="p-3 flex items-center justify-between"
                style={{
                  background: "white",
                  border: "1px solid var(--color-hair, #ddd)",
                  borderRadius: 12,
                }}
              >
                <div>
                  <p className="font-mono text-sm">{f.key}</p>
                  <p className="text-xs opacity-70">{f.description ?? "—"}</p>
                </div>
                <button
                  onClick={() => toggleFlag.mutate({ key: f.key, enabled: !f.enabled })}
                  className="px-3 py-1.5 text-xs"
                  style={{
                    background: f.enabled ? "var(--color-neon, #00ff88)" : "transparent",
                    color: "var(--color-ink, #0a0a0a)",
                    border: "1px solid var(--color-hair, #ddd)",
                    borderRadius: 999,
                    fontWeight: 600,
                  }}
                >
                  {f.enabled ? "ON" : "OFF"}
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
