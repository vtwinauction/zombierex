import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { adminListReports, adminResolveReport } from "@/lib/moderation.functions";
import { Empty, Panel, Pill, Table, Td, statusTone, when } from "@/components/command/ui";

export const Route = createFileRoute("/_authenticated/owner/command/moderation")({
  head: () => ({
    meta: [
      { title: "Moderation · Mission Control · ZOMBIEREX" },
      { name: "description", content: "Review reported content, resolve cases and enforce community standards." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Moderation · Mission Control" },
      { property: "og:description", content: "ZOMBIEREX content moderation queue." },
    ],
  }),
  component: ModerationPage,
});

const FILTERS = ["open", "reviewing", "resolved", "dismissed", "all"] as const;

function ModerationPage() {
  const qc = useQueryClient();
  const list = useServerFn(adminListReports);
  const resolve = useServerFn(adminResolveReport);
  const [status, setStatus] = useState<(typeof FILTERS)[number]>("open");

  const q = useQuery({
    queryKey: ["command", "reports", status],
    queryFn: () => list({ data: { status, limit: 150 } }),
    retry: false,
  });

  const m = useMutation({
    mutationFn: (v: { id: string; status: "reviewing" | "resolved" | "dismissed" }) => resolve({ data: v }),
    onSuccess: () => {
      toast.success("Report updated");
      qc.invalidateQueries({ queryKey: ["command", "reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mono-tag" style={{ color: "var(--color-neon)" }}>◆ MODERATION</p>
          <h1 className="text-2xl font-semibold">Reported content</h1>
        </div>
        <Link to="/admin/moderation" className="btn-ghost text-xs">Full moderation bay →</Link>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button key={f} className="chip" onClick={() => setStatus(f)}
            style={{
              background: status === f ? "rgba(0,200,83,0.14)" : "transparent",
              color: status === f ? "var(--color-neon)" : "var(--color-silver)",
              borderColor: "var(--color-hair-strong)",
            }}>{f}</button>
        ))}
      </div>

      <Panel tag="QUEUE" title={q.data ? `${q.data.length} reports` : "Loading…"}>
        {q.isLoading && <p className="text-sm opacity-60">Loading…</p>}
        {q.error && <p className="text-sm" style={{ color: "var(--color-heat)" }}>{String((q.error as Error).message)}</p>}
        {q.data && (q.data.length === 0 ? <Empty label="Queue is clear" /> : (
          <Table head={["Target", "Reason", "Details", "Status", "Reported", "Actions"]}>
            {(q.data as any[]).map((r) => (
              <tr key={r.id}>
                <Td><span className="mono-tag text-[10px]">{r.target_kind}</span></Td>
                <Td><span className="text-[13px]">{r.reason}</span></Td>
                <Td><span className="truncate text-[12px]" style={{ color: "var(--color-silver)" }}>{r.details ?? "—"}</span></Td>
                <Td><Pill tone={statusTone(r.status)}>{r.status}</Pill></Td>
                <Td><span className="text-[11px]">{when(r.created_at)}</span></Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    <button className="btn-ghost text-[11px]" disabled={m.isPending} onClick={() => m.mutate({ id: r.id, status: "reviewing" })}>Review</button>
                    <button className="btn-ghost text-[11px]" disabled={m.isPending} onClick={() => m.mutate({ id: r.id, status: "resolved" })}>Resolve</button>
                    <button className="btn-ghost text-[11px]" disabled={m.isPending} onClick={() => m.mutate({ id: r.id, status: "dismissed" })}>Dismiss</button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        ))}
      </Panel>
    </div>
  );
}
