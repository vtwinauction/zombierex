import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { crmBoard, crmMoveLead, crmSetCaseStatus, crmUpsertLead } from "@/lib/command.functions";
import { Empty, Metric, Panel, Pill, Table, Td, inputStyle, money, num, statusTone, when } from "@/components/command/ui";

export const Route = createFileRoute("/_authenticated/owner/command/crm")({
  head: () => ({
    meta: [
      { title: "CRM · Mission Control · ZOMBIEREX" },
      { name: "description", content: "Lead pipeline, customer relationships and support case handling." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "CRM · Mission Control" },
      { property: "og:description", content: "ZOMBIEREX CRM and support console." },
    ],
  }),
  component: CrmPage,
});

function CrmPage() {
  const qc = useQueryClient();
  const load = useServerFn(crmBoard);
  const upsert = useServerFn(crmUpsertLead);
  const move = useServerFn(crmMoveLead);
  const setCase = useServerFn(crmSetCaseStatus);

  const q = useQuery({ queryKey: ["command", "crm"], queryFn: () => load({ data: undefined as never }), retry: false });
  const [form, setForm] = useState({ name: "", company: "", email: "", value: "" });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["command", "crm"] });

  const addM = useMutation({
    mutationFn: () =>
      upsert({
        data: {
          name: form.name.trim(),
          company: form.company.trim() || undefined,
          email: form.email.trim() || "",
          value_cents: Math.round(Number(form.value || 0) * 100),
          kind: "business",
          stage: q.data?.stages?.[0]?.key ?? "new_lead",
          currency: "USD",
        },
      }),
    onSuccess: () => {
      toast.success("Lead added to pipeline");
      setForm({ name: "", company: "", email: "", value: "" });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moveM = useMutation({
    mutationFn: (v: { id: string; stage: string }) => move({ data: v }),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const caseM = useMutation({
    mutationFn: (v: { id: string; status: "open" | "pending" | "resolved" | "closed" }) => setCase({ data: v }),
    onSuccess: () => {
      toast.success("Case updated");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <p className="text-sm opacity-60">Loading CRM…</p>;
  if (q.error) return <p className="text-sm" style={{ color: "var(--color-heat)" }}>{String((q.error as Error).message)}</p>;
  const d = q.data!;
  const stages = (d.stages as any[]).length ? (d.stages as any[]) : [{ key: "new_lead", label: "New lead" }];
  const pipelineValue = (d.leads as any[]).reduce((a, l) => a + (l.value_cents ?? 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>◆ CRM & SUPPORT</p>
        <h1 className="text-2xl font-semibold">Relationships</h1>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Open leads" value={num(d.leads.length)} hi />
        <Metric label="Pipeline value" value={money(pipelineValue)} />
        <Metric label="Support cases" value={num(d.cases.length)} />
        <Metric label="Open cases" value={num((d.cases as any[]).filter((c) => c.status === "open").length)} />
      </div>

      <Panel tag="NEW LEAD" title="Add to pipeline">
        <div className="grid gap-2 sm:grid-cols-5">
          <input style={inputStyle} placeholder="Contact name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input style={inputStyle} placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          <input style={inputStyle} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input style={inputStyle} type="number" placeholder="Deal value" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          <button className="btn-solid text-xs" disabled={!form.name.trim() || addM.isPending} onClick={() => addM.mutate()}>Add lead</button>
        </div>
      </Panel>

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex min-w-max gap-3">
          {stages.map((s: any) => {
            const leads = (d.leads as any[]).filter((l) => l.stage === s.key);
            return (
              <div key={s.key} className="w-64 shrink-0">
                <div className="mb-2 flex items-center justify-between">
                  <p className="mono-tag" style={{ color: "var(--color-silver)" }}>{s.label ?? s.key}</p>
                  <span className="mono-tag text-[10px]">{leads.length}</span>
                </div>
                <div className="space-y-2">
                  {leads.length === 0 && <Empty label="—" />}
                  {leads.map((l) => (
                    <div key={l.id} className="surface-1 p-3" style={{ border: "1px solid var(--color-hair)", borderRadius: 8 }}>
                      <p className="truncate text-[13px] font-medium">{l.name}</p>
                      <p className="truncate text-[11px]" style={{ color: "var(--color-silver)" }}>{l.company ?? l.email ?? "—"}</p>
                      <p className="mt-1 text-[12px] tabular-nums">{money(l.value_cents, l.currency)}</p>
                      <select
                        className="mono-tag mt-2 w-full text-[10px]"
                        style={{ ...inputStyle, padding: "4px 6px" }}
                        value={l.stage}
                        onChange={(e) => moveM.mutate({ id: l.id, stage: e.target.value })}
                      >
                        {stages.map((x: any) => (
                          <option key={x.key} value={x.key}>{x.label ?? x.key}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Panel tag="SUPPORT" title="Cases & tickets">
        {d.cases.length === 0 ? <Empty label="No support cases" /> : (
          <Table head={["Subject", "Priority", "Status", "Opened", "Actions"]}>
            {(d.cases as any[]).map((c) => (
              <tr key={c.id}>
                <Td><span className="truncate text-[13px]">{c.subject}</span></Td>
                <Td><Pill tone={c.priority === "high" || c.priority === "urgent" ? "bad" : "muted"}>{c.priority ?? "normal"}</Pill></Td>
                <Td><Pill tone={statusTone(c.status)}>{c.status}</Pill></Td>
                <Td><span className="text-[11px]">{when(c.created_at)}</span></Td>
                <Td>
                  <div className="flex gap-1">
                    <button className="btn-ghost text-[11px]" onClick={() => caseM.mutate({ id: c.id, status: "pending" })}>Pending</button>
                    <button className="btn-ghost text-[11px]" onClick={() => caseM.mutate({ id: c.id, status: "resolved" })}>Resolve</button>
                    <button className="btn-ghost text-[11px]" onClick={() => caseM.mutate({ id: c.id, status: "closed" })}>Close</button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </div>
  );
}
