import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListReports,
  adminResolveReport,
  adminModerationQueueStats,
} from "@/lib/moderation.functions";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/moderation")({
  head: () => ({ meta: [
    { title: "Moderation · ZOMBIEREX Admin" },
    { name: "description", content: "Review reports, appeals, and enforcement actions." },
    { property: "og:title", content: "Moderation · ZOMBIEREX Admin" },
    { property: "og:description", content: "Review reports, appeals, and enforcement actions." },
  ] }),
  component: ModerationPage,
});

function ModerationPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListReports);
  const resolveFn = useServerFn(adminResolveReport);
  const statsFn = useServerFn(adminModerationQueueStats);
  const [status, setStatus] = useState<"open" | "reviewing" | "resolved" | "dismissed" | "all">("open");

  const stats = useQuery({ queryKey: ["mod-stats"], queryFn: () => statsFn() });
  const reports = useQuery({
    queryKey: ["mod-reports", status],
    queryFn: () => listFn({ data: { status, limit: 100 } }),
  });

  const resolve = useMutation({
    mutationFn: (vars: { id: string; status: "reviewing" | "resolved" | "dismissed" }) =>
      resolveFn({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mod-reports"] });
      qc.invalidateQueries({ queryKey: ["mod-stats"] });
    },
  });

  return (
    <div style={{ background: "var(--color-cream, #fafaf7)", minHeight: "100vh", color: "var(--color-ink, #0a0a0a)" }}>
      <main className="mx-auto max-w-3xl px-4 pb-32 pt-4">
        <h1 className="text-2xl font-bold mb-4">Moderation</h1>

        <div className="grid grid-cols-2 gap-2 mb-6">
          {stats.data && Object.entries(stats.data).map(([k, v]) => (
            <div key={k} className="p-3" style={{ background: "var(--color-graphite, #eee)", borderRadius: 12 }}>
              <p className="text-xs opacity-70 uppercase">{k.replace(/_/g, " ")}</p>
              <p className="text-2xl font-bold">{String(v)}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto">
          {(["open", "reviewing", "resolved", "dismissed", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className="px-3 py-1.5 text-xs"
              style={{
                background: status === s ? "var(--color-ink)" : "transparent",
                color: status === s ? "var(--color-cream, #fafaf7)" : "var(--color-ink)",
                border: "1px solid var(--color-hair, #ddd)",
                borderRadius: 999,
              }}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {reports.data?.map((r: any) => (
            <div key={r.id} className="p-3" style={{ background: "white", border: "1px solid var(--color-hair, #ddd)", borderRadius: 12 }}>
              <div className="flex justify-between text-xs opacity-70 mb-1">
                <span>{r.target_kind} · {r.reason}</span>
                <span>{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <p className="text-xs font-mono opacity-60 break-all">{r.target_id}</p>
              {r.details && <p className="text-sm mt-2">{r.details}</p>}
              <div className="flex gap-2 mt-3">
                {r.status === "open" && (
                  <button onClick={() => resolve.mutate({ id: r.id, status: "reviewing" })}
                    className="px-3 py-1 text-xs" style={btn}>Start review</button>
                )}
                {r.status !== "resolved" && (
                  <button onClick={() => resolve.mutate({ id: r.id, status: "resolved" })}
                    className="px-3 py-1 text-xs" style={btnPrimary}>Resolve</button>
                )}
                {r.status !== "dismissed" && (
                  <button onClick={() => resolve.mutate({ id: r.id, status: "dismissed" })}
                    className="px-3 py-1 text-xs" style={btn}>Dismiss</button>
                )}
              </div>
            </div>
          ))}
          {reports.data && reports.data.length === 0 && (
            <p className="text-sm opacity-60 text-center py-8">No reports in this queue.</p>
          )}
        </div>
      </main>
    </div>
  );
}

const btn: React.CSSProperties = {
  border: "1px solid var(--color-hair, #ddd)",
  background: "transparent",
  borderRadius: 8,
};
const btnPrimary: React.CSSProperties = {
  background: "var(--color-neon, #00ff88)",
  color: "var(--color-ink, #0a0a0a)",
  borderRadius: 8,
  fontWeight: 600,
};
