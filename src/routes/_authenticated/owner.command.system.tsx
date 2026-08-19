import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { systemAdmins, systemAuditLog, systemHealth, systemSetAdminScopes } from "@/lib/command.functions";
import { Empty, Panel, Pill, Table, Td, inputStyle, when } from "@/components/command/ui";

export const Route = createFileRoute("/_authenticated/owner/command/system")({
  head: () => ({
    meta: [
      { title: "System · Mission Control · ZOMBIEREX" },
      { name: "description", content: "Administrator roles, audit trail and platform health monitoring." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "System · Mission Control" },
      { property: "og:description", content: "ZOMBIEREX roles, audit log and system health." },
    ],
  }),
  component: SystemPage,
});

const SCOPES = [
  "overview",
  "users",
  "businesses",
  "marketplace",
  "crm",
  "support",
  "erp",
  "finance",
  "ads",
  "content",
  "moderation",
  "system",
];

function SystemPage() {
  const qc = useQueryClient();
  const adminsFn = useServerFn(systemAdmins);
  const auditFn = useServerFn(systemAuditLog);
  const healthFn = useServerFn(systemHealth);
  const setScopes = useServerFn(systemSetAdminScopes);

  const admins = useQuery({ queryKey: ["command", "admins"], queryFn: () => adminsFn({ data: undefined as never }), retry: false });
  const audit = useQuery({ queryKey: ["command", "audit"], queryFn: () => auditFn({ data: { limit: 150 } }), retry: false });
  const health = useQuery({
    queryKey: ["command", "health"],
    queryFn: () => healthFn({ data: undefined as never }),
    retry: false,
    refetchInterval: 60_000,
  });

  const [userId, setUserId] = useState("");
  const [label, setLabel] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  const m = useMutation({
    mutationFn: (v: { user_id: string; scopes: string[]; label?: string }) => setScopes({ data: v }),
    onSuccess: () => {
      toast.success("Administrator scopes updated");
      setUserId("");
      setLabel("");
      setPicked([]);
      qc.invalidateQueries({ queryKey: ["command", "admins"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div>
        <p className="mono-tag" style={{ color: "var(--color-neon)" }}>◆ SYSTEM</p>
        <h1 className="text-2xl font-semibold">Roles, audit & health</h1>
      </div>

      <Panel tag="HEALTH" title="Service status" right={<span className="mono-tag text-[10px]">{health.data ? when(health.data.checkedAt) : ""}</span>}>
        {health.isLoading && <p className="text-sm opacity-60">Probing services…</p>}
        {health.data && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {Object.entries(health.data.services).map(([k, v]: [string, any]) => (
              <div key={k} className="surface-1 p-3" style={{ border: "1px solid var(--color-hair)", borderRadius: 8 }}>
                <p className="mono-tag" style={{ color: "var(--color-silver)" }}>{k.toUpperCase()}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Pill tone={v.ok ? "ok" : "bad"}>{v.ok ? "OK" : "DOWN"}</Pill>
                  <span className="text-[11px] tabular-nums">{v.ms}ms</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {health.data && health.data.recentCrashes.length > 0 && (
          <div className="mt-3">
            <p className="mono-tag mb-1" style={{ color: "var(--color-silver)" }}>RECENT CRASHES</p>
            <ul className="space-y-1 text-[12px]">
              {(health.data.recentCrashes as any[]).map((c) => (
                <li key={c.id} className="flex justify-between gap-2">
                  <span className="truncate">{c.message}</span>
                  <span style={{ color: "var(--color-silver)" }}>{when(c.created_at)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>

      <Panel tag="ACCESS CONTROL" title="Administrators & scopes">
        <div className="grid gap-2 sm:grid-cols-2">
          <input style={inputStyle} placeholder="User ID (UUID)" value={userId} onChange={(e) => setUserId(e.target.value)} />
          <input style={inputStyle} placeholder="Role label (e.g. Finance Manager)" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SCOPES.map((s) => {
            const on = picked.includes(s);
            return (
              <button key={s} className="chip" onClick={() => setPicked(on ? picked.filter((x) => x !== s) : [...picked, s])}
                style={{
                  background: on ? "rgba(0,200,83,0.14)" : "transparent",
                  color: on ? "var(--color-neon)" : "var(--color-silver)",
                  borderColor: "var(--color-hair-strong)",
                }}>{s}</button>
            );
          })}
        </div>
        <button
          className="btn-solid mt-3 text-xs"
          disabled={m.isPending || userId.length < 30 || picked.length === 0}
          onClick={() => m.mutate({ user_id: userId.trim(), scopes: picked, label: label.trim() || undefined })}
        >
          Grant scopes
        </button>
        <p className="mt-2 text-[11px]" style={{ color: "var(--color-silver)" }}>
          Only the platform owner can create or change administrators. Every change is written to the audit trail.
        </p>

        <div className="mt-4">
          {admins.isLoading && <p className="text-sm opacity-60">Loading…</p>}
          {admins.error && <p className="text-sm" style={{ color: "var(--color-heat)" }}>{String((admins.error as Error).message)}</p>}
          {admins.data && (admins.data.length === 0 ? <Empty label="No delegated administrators" /> : (
            <Table head={["Administrator", "Label", "Scopes", "Updated", ""]}>
              {(admins.data as any[]).map((a) => (
                <tr key={a.user_id}>
                  <Td>
                    <p className="text-[13px]">{a.profile?.display_name ?? a.user_id}</p>
                    <p className="mono-tag text-[10px]" style={{ color: "var(--color-silver)" }}>@{a.profile?.handle ?? "—"}</p>
                  </Td>
                  <Td>{a.label ?? "—"}</Td>
                  <Td><div className="flex flex-wrap gap-1">{(a.scopes ?? []).map((s: string) => <Pill key={s}>{s}</Pill>)}</div></Td>
                  <Td><span className="text-[11px]">{when(a.updated_at ?? a.created_at)}</span></Td>
                  <Td>
                    <button className="btn-ghost text-[11px]" onClick={() => {
                      if (confirm("Revoke all admin scopes for this user?")) m.mutate({ user_id: a.user_id, scopes: [] });
                    }}>Revoke</button>
                  </Td>
                </tr>
              ))}
            </Table>
          ))}
        </div>
      </Panel>

      <Panel tag="AUDIT TRAIL" title="Every administrator action">
        {audit.isLoading && <p className="text-sm opacity-60">Loading…</p>}
        {audit.data && (audit.data.length === 0 ? <Empty label="No entries" /> : (
          <Table head={["When", "Action", "Target", "Actor"]}>
            {(audit.data as any[]).map((r) => (
              <tr key={r.id}>
                <Td><span className="text-[11px]">{when(r.created_at)}</span></Td>
                <Td><span className="mono-tag text-[10px]">{r.action}</span></Td>
                <Td><span className="text-[11px]">{r.target_table ?? r.target_kind ?? "—"} · {String(r.target_id ?? "").slice(0, 8)}</span></Td>
                <Td><span className="text-[11px]">{String(r.actor_id ?? "").slice(0, 8)}</span></Td>
              </tr>
            ))}
          </Table>
        ))}
      </Panel>
    </div>
  );
}
