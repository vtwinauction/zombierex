import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  commandEndSupportSession,
  commandSetUserBlock,
  commandStartSupportSession,
  commandUserDossier,
} from "@/lib/command.functions";
import { Empty, Panel, Pill, Table, Td, inputStyle, money, num, statusTone, when } from "@/components/command/ui";

export const Route = createFileRoute("/_authenticated/owner/command/users/$id")({
  head: () => ({
    meta: [
      { title: "Account dossier · Mission Control · ZOMBIEREX" },
      { name: "description", content: "Full account inspection: garage, activity, commerce, finance and security." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Account dossier · Mission Control" },
      { property: "og:description", content: "ZOMBIEREX account inspection console." },
    ],
  }),
  component: Dossier,
});

function Dossier() {
  const { id } = useParams({ from: "/_authenticated/owner/command/users/$id" });
  const qc = useQueryClient();
  const load = useServerFn(commandUserDossier);
  const block = useServerFn(commandSetUserBlock);
  const startSupport = useServerFn(commandStartSupportSession);
  const endSupport = useServerFn(commandEndSupportSession);

  const q = useQuery({
    queryKey: ["command", "user", id],
    queryFn: () => load({ data: { id } }),
    retry: false,
  });

  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [days, setDays] = useState("");
  const [supportReason, setSupportReason] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["command", "user", id] });

  const blockM = useMutation({
    mutationFn: (action: "block" | "unblock" | "suspend") =>
      block({
        data: {
          id,
          action,
          reason: reason.trim() || (action === "unblock" ? "Access restored by administrator" : ""),
          notes: notes.trim() || undefined,
          durationDays: days ? Number(days) : undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Account status updated and audited");
      setReason("");
      setNotes("");
      setDays("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const supportM = useMutation({
    mutationFn: () =>
      startSupport({ data: { targetUserId: id, reason: supportReason.trim(), minutes: 30 } }),
    onSuccess: () => {
      toast.success("Support access session opened (30 min, audited)");
      setSupportReason("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const endM = useMutation({
    mutationFn: (sid: string) => endSupport({ data: { id: sid } }),
    onSuccess: () => {
      toast.success("Support session closed");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <p className="text-sm opacity-60">Loading dossier…</p>;
  if (q.error) return <p className="text-sm" style={{ color: "var(--color-heat)" }}>{String((q.error as Error).message)}</p>;
  const d = q.data!;
  const p: any = d.profile;
  const activeSession = (d.supportSessions as any[]).find((s) => !s.ended_at && new Date(s.expires_at) > new Date());

  return (
    <div className="space-y-5">
      <Link to="/owner/command/users" className="btn-ghost inline-flex text-xs">← All users</Link>

      <Panel>
        <div className="flex flex-wrap items-center gap-3">
          {p.avatar_url ? (
            <img src={p.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <div className="h-14 w-14 rounded-full" style={{ background: "rgba(0,0,0,0.08)" }} />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold">{p.display_name ?? "—"}</h1>
            <p className="mono-tag text-[11px]" style={{ color: "var(--color-silver)" }}>
              @{p.handle} · {p.location ?? "no location"} · joined {when(p.created_at)}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              <Pill tone={p.is_suspended ? "bad" : "ok"}>{p.is_suspended ? "BLOCKED" : "ACTIVE"}</Pill>
              {p.is_verified && <Pill tone="ok">VERIFIED</Pill>}
              {p.is_premium && <Pill tone="warn">PREMIUM</Pill>}
              {d.roles.map((r: string) => <Pill key={r}>{r.toUpperCase()}</Pill>)}
            </div>
          </div>
        </div>
        {p.is_suspended && (
          <p className="mt-3 text-[12px]" style={{ color: "var(--color-heat)" }}>
            Blocked {when(p.suspended_at)} — {p.suspended_reason}
          </p>
        )}
      </Panel>

      <Panel tag="ENFORCEMENT" title="Block / unblock account">
        <div className="grid gap-2 sm:grid-cols-3">
          <input style={inputStyle} placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <input style={inputStyle} placeholder="Internal notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <input style={inputStyle} type="number" min={1} placeholder="Suspension days (optional)" value={days} onChange={(e) => setDays(e.target.value)} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="btn-solid text-xs"
            disabled={blockM.isPending || reason.trim().length < 3}
            onClick={() => {
              if (confirm("Block this account? The user loses access immediately.")) blockM.mutate("block");
            }}
          >
            Block account
          </button>
          <button
            className="btn-ghost text-xs"
            disabled={blockM.isPending || reason.trim().length < 3 || !days}
            onClick={() => blockM.mutate("suspend")}
          >
            Temporarily suspend
          </button>
          <button
            className="btn-ghost text-xs"
            disabled={blockM.isPending || !p.is_suspended}
            onClick={() => blockM.mutate("unblock")}
          >
            Unblock
          </button>
        </div>
        <p className="mt-2 text-[11px]" style={{ color: "var(--color-silver)" }}>
          Records are archived, never deleted. Every action stores the administrator, timestamp, reason and previous status.
        </p>
      </Panel>

      <Panel tag="SUPPORT ACCESS" title="Secure troubleshooting session">
        {activeSession ? (
          <div className="flex flex-wrap items-center gap-3">
            <Pill tone="warn">SUPPORT ACCESS ACTIVE</Pill>
            <span className="text-[12px]">expires {when(activeSession.expires_at)}</span>
            <button className="btn-ghost text-xs" onClick={() => endM.mutate(activeSession.id)}>End session</button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <input style={inputStyle} placeholder="Reason for accessing this account" value={supportReason} onChange={(e) => setSupportReason(e.target.value)} />
            <button className="btn-solid whitespace-nowrap text-xs" disabled={supportReason.trim().length < 5 || supportM.isPending} onClick={() => supportM.mutate()}>
              Open 30-min session
            </button>
          </div>
        )}
        <p className="mt-2 text-[11px]" style={{ color: "var(--color-silver)" }}>
          Support sessions never expose passwords, hashes or payment credentials — they authorise read access for troubleshooting and are fully audited.
        </p>
        {d.supportSessions.length > 0 && (
          <div className="mt-3">
            <Table head={["Started", "Expires", "Ended", "Reason"]}>
              {(d.supportSessions as any[]).map((s) => (
                <tr key={s.id}>
                  <Td>{when(s.started_at)}</Td>
                  <Td>{when(s.expires_at)}</Td>
                  <Td>{when(s.ended_at)}</Td>
                  <Td>{s.reason}</Td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel tag="GARAGE" title={`Vehicles (${d.vehicles.length})`}>
          {d.vehicles.length === 0 ? <Empty /> : (
            <ul className="space-y-2 text-[13px]">
              {(d.vehicles as any[]).map((v) => (
                <li key={v.id} className="flex justify-between">
                  <span className="truncate">{v.year} {v.make} {v.model} {v.nickname ? `· ${v.nickname}` : ""}</span>
                  <Pill>{v.kind}</Pill>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel tag="SOCIAL" title={`Recent posts (${d.posts.length})`}>
          {d.posts.length === 0 ? <Empty /> : (
            <ul className="space-y-2 text-[13px]">
              {(d.posts as any[]).map((x) => (
                <li key={x.id} className="flex justify-between gap-2">
                  <span className="truncate">{x.caption || `(${x.kind})`}</span>
                  {x.is_hidden ? <Pill tone="bad">HIDDEN</Pill> : <Pill tone="muted">{when(x.created_at)}</Pill>}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel tag="MARKETPLACE" title={`Listings (${d.listings.length}) · Orders (${d.orders.length})`}>
          {d.listings.length + d.orders.length === 0 ? <Empty /> : (
            <ul className="space-y-2 text-[13px]">
              {(d.listings as any[]).map((l) => (
                <li key={l.id} className="flex justify-between"><span className="truncate">{l.title}</span><span>{money(l.price_cents, l.currency)}</span></li>
              ))}
              {(d.orders as any[]).map((o) => (
                <li key={o.id} className="flex justify-between"><span>Order · {when(o.created_at)}</span><span>{money(o.total_cents, o.currency)}</span></li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel tag="FINANCIAL" title={`Payments — lifetime ${money(d.revenueCents)}`}>
          {d.payments.length === 0 ? <Empty /> : (
            <Table head={["Date", "Amount", "Provider", "Status"]}>
              {(d.payments as any[]).map((x) => (
                <tr key={x.id}>
                  <Td>{when(x.created_at)}</Td>
                  <Td>{money(x.amount_cents, x.currency)}</Td>
                  <Td>{x.provider ?? "—"}</Td>
                  <Td><Pill tone={statusTone(x.status)}>{x.status}</Pill></Td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>

        <Panel tag="BUSINESS" title="Association">
          {d.vendor ? (
            <div className="text-[13px]">
              <p className="font-medium">{(d.vendor as any).business_name}</p>
              <p className="mono-tag text-[10px]" style={{ color: "var(--color-silver)" }}>{(d.vendor as any).business_type}</p>
              <div className="mt-1"><Pill tone={statusTone((d.vendor as any).verification_status)}>{(d.vendor as any).verification_status}</Pill></div>
            </div>
          ) : <Empty label="No business association" />}
          <div className="mt-3 text-[13px]">
            <p className="mono-tag" style={{ color: "var(--color-silver)" }}>SUBSCRIPTIONS</p>
            {d.subscriptions.length === 0 ? <Empty label="No subscriptions" /> : (
              <ul className="mt-1 space-y-1">
                {(d.subscriptions as any[]).map((s) => (
                  <li key={s.id} className="flex justify-between"><span>{s.plan_id}</span><Pill tone={statusTone(s.status)}>{s.status}</Pill></li>
                ))}
              </ul>
            )}
          </div>
        </Panel>

        <Panel tag="SECURITY" title={`Reports against this account (${d.reports.length})`}>
          {d.reports.length === 0 ? <Empty label="No reports" /> : (
            <ul className="space-y-2 text-[13px]">
              {(d.reports as any[]).map((r) => (
                <li key={r.id} className="flex justify-between"><span className="truncate">{r.reason}</span><Pill tone={statusTone(r.status)}>{r.status}</Pill></li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px]" style={{ color: "var(--color-silver)" }}>
            Login history and device sessions are managed by the authentication provider and are not exposed here. Total posts on record: {num(p.posts_count)}.
          </p>
        </Panel>
      </div>
    </div>
  );
}
