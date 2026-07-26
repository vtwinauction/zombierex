import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listCrashReports } from "@/lib/crash-admin.functions";

const crashesQuery = queryOptions({
  queryKey: ["admin-crashes"],
  queryFn: () => listCrashReports({ data: { limit: 100 } }),
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

function CrashesPage() {
  const { data } = useSuspenseQuery(crashesQuery);
  const rows = data.rows ?? [];

  return (
    <div className="px-5">
      <p className="mono-tag" style={{ color: "var(--color-silver)" }}>
        RECENT CRASHES · {rows.length}
      </p>
      {rows.length === 0 ? (
        <div className="mt-4 rounded-md border p-6 text-center text-[13px]"
          style={{ borderColor: "var(--color-hair-strong)", color: "var(--color-silver)" }}>
          No crashes reported. All systems nominal.
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="p-3" style={{ border: "1px solid var(--color-hair-strong)", borderRadius: 6 }}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13px] font-medium" style={{ color: "var(--color-ink)" }}>
                  {r.message}
                </p>
                <span className="mono-tag shrink-0" style={{ color: "var(--color-silver)" }}>
                  {timeAgo(r.created_at)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {r.route && <span className="mono-tag" style={{ color: "var(--color-neon)" }}>{r.route}</span>}
                {r.platform && <span className="mono-tag" style={{ color: "var(--color-silver)" }}>{r.platform}</span>}
                {r.mechanism && <span className="mono-tag" style={{ color: "var(--color-silver)" }}>{r.mechanism}</span>}
                {r.app_version && <span className="mono-tag" style={{ color: "var(--color-silver)" }}>v{r.app_version}</span>}
              </div>
              {r.stack && (
                <details className="mt-2">
                  <summary className="mono-tag cursor-pointer" style={{ color: "var(--color-silver)" }}>
                    STACK TRACE
                  </summary>
                  <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-[11px] leading-tight"
                    style={{ color: "var(--color-silver)" }}>
                    {r.stack}
                  </pre>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
