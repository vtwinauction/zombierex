import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listFinancialAudit } from "@/lib/finance.functions";

export const Route = createFileRoute("/_authenticated/owner/finance/audit")({
  component: AuditPage,
});

function AuditPage() {
  const load = useServerFn(listFinancialAudit);
  const q = useQuery({ queryKey: ["finance", "audit"], queryFn: () => load({ data: undefined as any }) });

  return (
    <div className="space-y-3 p-5">
      <p className="mono-tag text-[10px] opacity-60">IMMUTABLE FINANCIAL AUDIT TRAIL</p>
      {q.isLoading && <p className="text-sm opacity-60">Loading audit log…</p>}
      {q.data?.length === 0 && <p className="text-xs opacity-50">No financial changes recorded yet.</p>}
      {((q.data ?? []) as any[]).map((row) => (
        <div key={row.id} className="card-surface p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[12px]">{row.action}</span>
            <span className="mono-tag text-[10px] opacity-50">{new Date(row.created_at).toLocaleString()}</span>
          </div>
          <p className="mt-0.5 text-[11px] opacity-60">
            {row.actor_name ?? "system"} · {row.target_kind}
            {row.target_id ? ` · ${String(row.target_id).slice(0, 8)}` : ""}
          </p>
          {row.meta && Object.keys(row.meta).length > 0 && (
            <pre className="mt-2 overflow-x-auto text-[10px] opacity-50">{JSON.stringify(row.meta, null, 2)}</pre>
          )}
        </div>
      ))}
    </div>
  );
}
