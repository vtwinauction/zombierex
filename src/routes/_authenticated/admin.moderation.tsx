import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  adminListReports,
  adminResolveReport,
  adminModerationQueueStats,
} from "@/lib/moderation.functions";

export const Route = createFileRoute("/_authenticated/admin/moderation")({
  head: () => ({
    meta: [
      { title: "Moderation · ZOMBIEREX Admin" },
      { name: "description", content: "Review reports, appeals, and enforcement actions." },
      { property: "og:title", content: "Moderation · ZOMBIEREX Admin" },
      { property: "og:description", content: "Review reports, appeals, and enforcement actions." },
    ],
  }),
  component: ModerationPage,
});

type Status = "open" | "reviewing" | "resolved" | "dismissed" | "all";
type Kind =
  | "all" | "post" | "reel" | "story" | "comment" | "message"
  | "profile" | "community" | "event" | "listing";
type Report = {
  id: string;
  reporter_id: string;
  target_kind: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
};

const KINDS: Kind[] = [
  "all", "post", "reel", "story", "comment", "message",
  "profile", "community", "event", "listing",
];

const SEVERE = new Set(["hate", "violence", "self_harm", "nudity", "harassment"]);

function hrefFor(kind: string, id: string): string | null {
  switch (kind) {
    case "post": return `/post/${id}`;
    case "reel": return `/reels/${id}`;
    case "comment": return `/post/${id}`;
    case "profile": return `/u/${id}`;
    case "event": return `/events/${id}`;
    case "listing": return `/marketplace/${id}`;
    case "community": return `/communities/${id}`;
    case "message": return `/messages/${id}`;
    default: return null;
  }
}

function slaAge(iso: string): { label: string; tone: "ok" | "warn" | "hot" } {
  const hrs = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hrs < 1) return { label: `${Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))}m`, tone: "ok" };
  if (hrs < 24) return { label: `${hrs}h`, tone: hrs >= 12 ? "warn" : "ok" };
  const days = Math.floor(hrs / 24);
  return { label: `${days}d`, tone: days >= 3 ? "hot" : "warn" };
}

function ModerationPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListReports);
  const resolveFn = useServerFn(adminResolveReport);
  const statsFn = useServerFn(adminModerationQueueStats);

  const [status, setStatus] = useState<Status>("open");
  const [kind, setKind] = useState<Kind>("all");
  const [severeOnly, setSevereOnly] = useState(false);
  const [groupByTarget, setGroupByTarget] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const stats = useQuery({ queryKey: ["mod-stats"], queryFn: () => statsFn() });
  const reports = useQuery({
    queryKey: ["mod-reports", status],
    queryFn: () => listFn({ data: { status, limit: 200 } }) as Promise<Report[]>,
  });

  const resolve = useMutation({
    mutationFn: (vars: { id: string; status: "reviewing" | "resolved" | "dismissed" }) =>
      resolveFn({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mod-reports"] });
      qc.invalidateQueries({ queryKey: ["mod-stats"] });
    },
  });

  const filtered = useMemo(() => {
    const rows = reports.data ?? [];
    return rows.filter((r) => {
      if (kind !== "all" && r.target_kind !== kind) return false;
      if (severeOnly && !SEVERE.has(r.reason)) return false;
      return true;
    });
  }, [reports.data, kind, severeOnly]);

  const groups = useMemo(() => {
    if (!groupByTarget) return null;
    const map = new Map<string, Report[]>();
    for (const r of filtered) {
      const key = `${r.target_kind}:${r.target_id}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [filtered, groupByTarget]);

  const allVisibleIds = useMemo(() => filtered.map((r) => r.id), [filtered]);
  const allSelected = selected.size > 0 && allVisibleIds.every((id) => selected.has(id));

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }
  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allVisibleIds));
  }

  async function bulk(action: "reviewing" | "resolved" | "dismissed") {
    const ids = Array.from(selected);
    if (!ids.length) return;
    toast.loading(`Applying ${action}…`, { id: "mod-bulk" });
    let ok = 0;
    for (const id of ids) {
      try {
        await resolveFn({ data: { id, status: action } });
        ok++;
      } catch { /* continue */ }
    }
    toast.success(`${action} · ${ok}/${ids.length}`, { id: "mod-bulk" });
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: ["mod-reports"] });
    qc.invalidateQueries({ queryKey: ["mod-stats"] });
  }

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

        {/* Status tabs */}
        <div className="flex gap-2 mb-3 overflow-x-auto">
          {(["open", "reviewing", "resolved", "dismissed", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setSelected(new Set()); }}
              className="px-3 py-1.5 text-xs whitespace-nowrap"
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

        {/* Kind filter */}
        <div className="flex gap-2 mb-3 overflow-x-auto">
          {KINDS.map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className="px-2.5 py-1 text-[11px] whitespace-nowrap"
              style={{
                background: kind === k ? "var(--color-neon, #00ff88)" : "transparent",
                color: "var(--color-ink)",
                border: "1px solid var(--color-hair, #ddd)",
                borderRadius: 999,
                fontWeight: kind === k ? 600 : 400,
              }}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-3 mb-4 text-xs">
          <label className="inline-flex items-center gap-1.5">
            <input type="checkbox" checked={severeOnly} onChange={(e) => setSevereOnly(e.target.checked)} />
            Severe only
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input type="checkbox" checked={groupByTarget} onChange={(e) => setGroupByTarget(e.target.checked)} />
            Group by target
          </label>
          <span className="ml-auto opacity-60">{filtered.length} items</span>
        </div>

        {/* Bulk bar */}
        {selected.size > 0 && (
          <div className="sticky top-14 z-10 mb-3 p-2 flex items-center gap-2"
            style={{ background: "var(--color-ink)", color: "var(--color-cream, #fafaf7)", borderRadius: 10 }}>
            <span className="text-xs font-mono px-2">{selected.size} selected</span>
            <button className="ml-auto px-2 py-1 text-[11px]" style={btnDark} onClick={() => bulk("reviewing")}>Review</button>
            <button className="px-2 py-1 text-[11px]" style={btnGreen} onClick={() => bulk("resolved")}>Resolve</button>
            <button className="px-2 py-1 text-[11px]" style={btnDark} onClick={() => bulk("dismissed")}>Dismiss</button>
            <button className="px-2 py-1 text-[11px]" style={btnDark} onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        )}

        {filtered.length > 0 && (
          <label className="flex items-center gap-2 text-xs mb-2 pl-1">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            Select all visible
          </label>
        )}

        {/* Grouped view */}
        {groups && (
          <div className="space-y-3">
            {groups.map(([key, items]) => {
              const first = items[0];
              const link = hrefFor(first.target_kind, first.target_id);
              return (
                <div key={key} className="p-3" style={{ background: "white", border: "1px solid var(--color-hair, #ddd)", borderRadius: 12 }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="mono-tag text-[10px] px-2 py-0.5" style={{ background: "var(--color-graphite, #eee)", borderRadius: 4 }}>
                      {first.target_kind.toUpperCase()}
                    </span>
                    <span className="text-xs font-bold">{items.length} report{items.length > 1 ? "s" : ""}</span>
                    {link && (
                      <Link to={link} className="ml-auto text-xs underline">Open target →</Link>
                    )}
                  </div>
                  <div className="space-y-2">
                    {items.map((r) => <Row key={r.id} r={r} selected={selected.has(r.id)} toggle={() => toggle(r.id)} resolve={resolve.mutate} />)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Flat view */}
        {!groups && (
          <div className="space-y-2">
            {filtered.map((r) => <Row key={r.id} r={r} selected={selected.has(r.id)} toggle={() => toggle(r.id)} resolve={resolve.mutate} showLink />)}
          </div>
        )}

        {reports.data && filtered.length === 0 && (
          <p className="text-sm opacity-60 text-center py-8">No reports match these filters.</p>
        )}
      </main>
    </div>
  );
}

function Row({
  r, selected, toggle, resolve, showLink,
}: {
  r: Report;
  selected: boolean;
  toggle: () => void;
  resolve: (v: { id: string; status: "reviewing" | "resolved" | "dismissed" }) => void;
  showLink?: boolean;
}) {
  const sla = slaAge(r.created_at);
  const severe = SEVERE.has(r.reason);
  const link = showLink ? hrefFor(r.target_kind, r.target_id) : null;
  const slaColor = sla.tone === "hot" ? "#ff3b3b" : sla.tone === "warn" ? "#f5a623" : "var(--color-ash, #888)";

  return (
    <div className="p-2" style={{ border: "1px solid var(--color-hair, #ddd)", borderRadius: 10 }}>
      <div className="flex items-start gap-2">
        <input type="checkbox" checked={selected} onChange={toggle} className="mt-1" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {showLink && (
              <span className="mono-tag px-1.5 py-0.5" style={{ background: "var(--color-graphite, #eee)", borderRadius: 4 }}>
                {r.target_kind}
              </span>
            )}
            <span className="px-1.5 py-0.5"
              style={{
                background: severe ? "#ff3b3b" : "var(--color-graphite, #eee)",
                color: severe ? "white" : "var(--color-ink)",
                borderRadius: 4,
                fontWeight: severe ? 700 : 500,
              }}>
              {r.reason}
            </span>
            <span className="px-1.5 py-0.5" style={{ color: slaColor, border: `1px solid ${slaColor}`, borderRadius: 4, fontWeight: 600 }}>
              {sla.label}
            </span>
            <span className="ml-auto opacity-60">{new Date(r.created_at).toLocaleString()}</span>
          </div>
          {r.details && <p className="text-sm mt-1.5">{r.details}</p>}
          <p className="text-[10px] font-mono opacity-50 break-all mt-1">{r.target_id}</p>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {link && <Link to={link} className="px-2 py-1 text-[11px] underline">Open</Link>}
            {r.status === "open" && (
              <button onClick={() => resolve({ id: r.id, status: "reviewing" })} className="px-2 py-1 text-[11px]" style={btn}>Review</button>
            )}
            {r.status !== "resolved" && (
              <button onClick={() => resolve({ id: r.id, status: "resolved" })} className="px-2 py-1 text-[11px]" style={btnPrimary}>Resolve</button>
            )}
            {r.status !== "dismissed" && (
              <button onClick={() => resolve({ id: r.id, status: "dismissed" })} className="px-2 py-1 text-[11px]" style={btn}>Dismiss</button>
            )}
          </div>
        </div>
      </div>
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
const btnDark: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.2)",
  background: "transparent",
  color: "var(--color-cream, #fafaf7)",
  borderRadius: 6,
};
const btnGreen: React.CSSProperties = {
  background: "var(--color-neon, #00ff88)",
  color: "var(--color-ink, #0a0a0a)",
  borderRadius: 6,
  fontWeight: 700,
};
