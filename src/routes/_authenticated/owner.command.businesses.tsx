import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { commandListBusinesses, commandSetBusinessStatus } from "@/lib/command.functions";
import { Empty, Panel, Pill, Table, Td, inputStyle, num, statusTone, when } from "@/components/command/ui";

export const Route = createFileRoute("/_authenticated/owner/command/businesses")({
  head: () => ({
    meta: [
      { title: "Businesses · Mission Control · ZOMBIEREX" },
      { name: "description", content: "Approve, suspend and manage dealers, workshops and sellers." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Businesses · Mission Control" },
      { property: "og:description", content: "ZOMBIEREX business administration." },
    ],
  }),
  component: BusinessesPage,
});

const FILTERS = ["all", "pending", "approved", "rejected", "info_requested"] as const;

function BusinessesPage() {
  const qc = useQueryClient();
  const list = useServerFn(commandListBusinesses);
  const setStatusFn = useServerFn(commandSetBusinessStatus);
  const [status, setStatus] = useState<(typeof FILTERS)[number]>("all");
  const [term, setTerm] = useState("");
  const [q, setQ] = useState("");

  const res = useQuery({
    queryKey: ["command", "businesses", status, q],
    queryFn: () => list({ data: { status, q: q || undefined, limit: 100 } }),
    retry: false,
  });

  const m = useMutation({
    mutationFn: (v: { id: string; status: "approved" | "rejected" | "info_requested" | "pending"; notes?: string }) =>
      setStatusFn({ data: v }),
    onSuccess: () => {
      toast.success("Business updated and audited");
      qc.invalidateQueries({ queryKey: ["command", "businesses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div>
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>◆ BUSINESSES</p>
        <h1 className="text-2xl font-semibold">Dealers, workshops & sellers</h1>
      </div>

      <Panel>
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); setQ(term.trim()); }}>
          <input style={inputStyle} placeholder="Search business name, slug or email…" value={term} onChange={(e) => setTerm(e.target.value)} />
          <button className="btn-solid whitespace-nowrap" type="submit">Search</button>
        </form>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button key={f} className="chip" onClick={() => setStatus(f)}
              style={{
                background: status === f ? "rgba(0,200,83,0.14)" : "transparent",
                color: status === f ? "var(--color-neon)" : "var(--color-silver)",
                borderColor: "var(--color-hair-strong)",
              }}>{f}</button>
          ))}
        </div>
      </Panel>

      <Panel tag="REGISTRY" title={res.data ? `${num(res.data.total)} businesses` : "Loading…"}>
        {res.isLoading && <p className="text-sm opacity-60">Loading…</p>}
        {res.error && <p className="text-sm" style={{ color: "var(--color-heat)" }}>{String((res.error as Error).message)}</p>}
        {res.data && (res.data.rows.length === 0 ? <Empty /> : (
          <Table head={["Business", "Type", "Location", "Status", "Joined", "Actions"]}>
            {(res.data.rows as any[]).map((b) => (
              <tr key={b.id}>
                <Td>
                  <p className="truncate text-[13px]">{b.business_name}</p>
                  <p className="mono-tag text-[10px]" style={{ color: "var(--color-silver)" }}>{b.email ?? b.slug}</p>
                </Td>
                <Td><span className="mono-tag text-[10px]">{b.business_type ?? "—"}</span></Td>
                <Td><span className="text-[12px]">{[b.city, b.country].filter(Boolean).join(", ") || "—"}</span></Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    <Pill tone={statusTone(b.verification_status)}>{b.verification_status}</Pill>
                    {b.is_premium && <Pill tone="warn">PREMIUM</Pill>}
                  </div>
                </Td>
                <Td><span className="text-[11px]" style={{ color: "var(--color-silver)" }}>{when(b.created_at)}</span></Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    <button className="btn-ghost text-[11px]" disabled={m.isPending} onClick={() => m.mutate({ id: b.id, status: "approved" })}>Approve</button>
                    <button className="btn-ghost text-[11px]" disabled={m.isPending} onClick={() => m.mutate({ id: b.id, status: "info_requested" })}>Request info</button>
                    <button className="btn-ghost text-[11px]" disabled={m.isPending} onClick={() => {
                      const notes = prompt("Reason for rejection / suspension?") ?? undefined;
                      if (notes) m.mutate({ id: b.id, status: "rejected", notes });
                    }}>Reject</button>
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
