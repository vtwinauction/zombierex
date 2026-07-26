import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listCrashReports } from "@/lib/crash-admin.functions";

const crashesQuery = queryOptions({
  queryKey: ["admin-crashes"],
  queryFn: () => listCrashReports({ data: { limit: 500 } }),
});

export const Route = createFileRoute("/_authenticated/admin/crashes")({
  head: () => ({ meta: [{ title: "Crash Reports · ZOMBIEREX" }, { name: "robots", content: "noindex" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(crashesQuery),
  component: CrashesPage,
});

function timeAgo(iso: string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

function fingerprint(message: string, stack: string | null | undefined) {
  const firstFrame = (stack ?? "")
    .split("\n")
    .map((s) => s.trim())
    .find((l) => l.startsWith("at ") || /\.tsx?:\d+/.test(l)) ?? "";
  return `${message.slice(0, 160)}::${firstFrame.slice(0, 200)}`;
}

type Row = {
  id: string;
  message: string;
  stack: string | null;
  route: string | null;
  platform: string | null;
  mechanism: string | null;
  app_version: string | null;
  created_at: string;
};

type Group = {
  key: string;
  message: string;
  stack: string | null;
  count: number;
  lastSeen: string;
  firstSeen: string;
  routes: Set<string>;
  platforms: Set<string>;
  mechanisms: Set<string>;
  latest: Row;
};

function groupRows(rows: Row[]): Group[] {
  const map = new Map<string, Group>();
  for (const r of rows) {
    const key = fingerprint(r.message, r.stack);
    const g = map.get(key);
    if (!g) {
      map.set(key, {
        key,
        message: r.message,
        stack: r.stack,
        count: 1,
        lastSeen: r.created_at,
        firstSeen: r.created_at,
        routes: new Set(r.route ? [r.route] : []),
        platforms: new Set(r.platform ? [r.platform] : []),
        mechanisms: new Set(r.mechanism ? [r.mechanism] : []),
        latest: r,
      });
    } else {
      g.count++;
      if (r.created_at > g.lastSeen) { g.lastSeen = r.created_at; g.latest = r; }
      if (r.created_at < g.firstSeen) g.firstSeen = r.created_at;
      if (r.route) g.routes.add(r.route);
      if (r.platform) g.platforms.add(r.platform);
      if (r.mechanism) g.mechanisms.add(r.mechanism);
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    b.lastSeen.localeCompare(a.lastSeen) || b.count - a.count,
  );
}

function CrashesPage() {
  const { data } = useSuspenseQuery(crashesQuery);
  const rows = (data.rows ?? []) as Row[];
  const [mode, setMode] = useState<"grouped" | "recent">("grouped");
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(window.localStorage.getItem("zrex.crashes.dismissed") ?? "[]")); }
    catch { return new Set(); }
  });

  const groups = useMemo(() => groupRows(rows).filter((g) => !dismissed.has(g.key)), [rows, dismissed]);
  const totalHidden = useMemo(() => rows.length - groups.reduce((s, g) => s + g.count, 0), [rows, groups]);

  function dismiss(key: string) {
    const next = new Set(dismissed); next.add(key); setDismissed(next);
    try { window.localStorage.setItem("zrex.crashes.dismissed", JSON.stringify(Array.from(next))); } catch {}
  }
  function restoreAll() {
    setDismissed(new Set());
    try { window.localStorage.removeItem("zrex.crashes.dismissed"); } catch {}
  }

  return (
    <div className="px-5">
      <div className="flex items-center justify-between">
        <p className="mono-tag" style={{ color: "var(--color-silver)" }}>
          CRASHES · {rows.length} events · {groups.length} groups{totalHidden > 0 && ` · ${totalHidden} hidden`}
        </p>
        <div className="flex gap-2">
          <button
            className="mono-tag tap"
            onClick={() => setMode(mode === "grouped" ? "recent" : "grouped")}
            style={{ color: "var(--color-neon)" }}
          >
            {mode === "grouped" ? "SHOW RECENT" : "SHOW GROUPED"}
          </button>
          {dismissed.size > 0 && (
            <button className="mono-tag tap" onClick={restoreAll} style={{ color: "var(--color-silver)" }}>
              RESTORE
            </button>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="mt-4 rounded-md border p-6 text-center text-[13px]"
          style={{ borderColor: "var(--color-hair-strong)", color: "var(--color-silver)" }}>
          No crashes reported. All systems nominal.
        </div>
      ) : mode === "grouped" ? (
        <ul className="mt-3 space-y-2">
          {groups.map((g) => (
            <li key={g.key} className="p-3" style={{ border: "1px solid var(--color-hair-strong)", borderRadius: 6 }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium" style={{ color: "var(--color-ink)" }}>
                    {g.message}
                  </p>
                  <p className="mono-tag mt-1" style={{ color: "var(--color-silver)" }}>
                    ×{g.count} · last {timeAgo(g.lastSeen)} · first {timeAgo(g.firstSeen)}
                  </p>
                </div>
                <button
                  onClick={() => dismiss(g.key)}
                  className="mono-tag tap shrink-0"
                  style={{ color: "var(--color-silver)" }}
                  aria-label="Ignore this group"
                >
                  IGNORE
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {Array.from(g.routes).slice(0, 4).map((r) => (
                  <span key={r} className="mono-tag" style={{ color: "var(--color-neon)" }}>{r}</span>
                ))}
                {Array.from(g.platforms).map((p) => (
                  <span key={p} className="mono-tag" style={{ color: "var(--color-silver)" }}>{p}</span>
                ))}
                {Array.from(g.mechanisms).map((m) => (
                  <span key={m} className="mono-tag" style={{ color: "var(--color-silver)" }}>{m}</span>
                ))}
              </div>
              {g.stack && (
                <details className="mt-2">
                  <summary className="mono-tag cursor-pointer" style={{ color: "var(--color-silver)" }}>
                    STACK TRACE (latest)
                  </summary>
                  <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-[11px] leading-tight"
                    style={{ color: "var(--color-silver)" }}>
                    {g.stack}
                  </pre>
                </details>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.slice(0, 100).map((r) => (
            <li key={r.id} className="p-3" style={{ border: "1px solid var(--color-hair-strong)", borderRadius: 6 }}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13px] font-medium" style={{ color: "var(--color-ink)" }}>{r.message}</p>
                <span className="mono-tag shrink-0" style={{ color: "var(--color-silver)" }}>{timeAgo(r.created_at)}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {r.route && <span className="mono-tag" style={{ color: "var(--color-neon)" }}>{r.route}</span>}
                {r.platform && <span className="mono-tag" style={{ color: "var(--color-silver)" }}>{r.platform}</span>}
                {r.mechanism && <span className="mono-tag" style={{ color: "var(--color-silver)" }}>{r.mechanism}</span>}
                {r.app_version && <span className="mono-tag" style={{ color: "var(--color-silver)" }}>v{r.app_version}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
