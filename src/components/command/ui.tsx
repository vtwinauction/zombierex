/**
 * Shared Mission Control primitives — dense, technical, responsive.
 * Purely presentational; every one uses the ZOMBIEREX design tokens.
 */
import { formatMoney } from "@/lib/money";
export { formatMoney as money };
import type { ReactNode } from "react";


export function num(n?: number | null) {
  return new Intl.NumberFormat().format(n ?? 0);
}

export function when(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function Panel({
  title,
  tag,
  right,
  children,
  className = "",
}: {
  title?: string;
  tag?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`surface-1 ${className}`}
      style={{ border: "1px solid var(--color-hair)", borderRadius: 10 }}
    >
      {(title || right) && (
        <header
          className="flex items-center justify-between gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid var(--color-hair)" }}
        >
          <div className="min-w-0">
            {tag && (
              <p className="mono-tag" style={{ color: "var(--color-neon)" }}>
                {tag}
              </p>
            )}
            {title && <h2 className="truncate text-[15px] font-medium">{title}</h2>}
          </div>
          {right}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Metric({
  label,
  value,
  sub,
  hi,
}: {
  label: string;
  value: string | number;
  sub?: string;
  hi?: boolean;
}) {
  return (
    <div
      className="surface-1 p-3"
      style={{ border: "1px solid var(--color-hair)", borderRadius: 8 }}
    >
      <p className="mono-tag truncate" style={{ color: "var(--color-silver)" }}>
        {label}
      </p>
      <p
        className="mt-1 text-xl font-semibold tabular-nums"
        style={{ color: hi ? "var(--color-neon)" : "var(--color-ink)" }}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-[11px]" style={{ color: "var(--color-silver)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

export function Pill({ tone = "muted", children }: { tone?: string; children: ReactNode }) {
  const map: Record<string, { bg: string; fg: string }> = {
    ok: { bg: "rgba(0,200,83,0.14)", fg: "#00a344" },
    warn: { bg: "rgba(255,176,32,0.16)", fg: "#a86a00" },
    bad: { bg: "rgba(255,77,77,0.14)", fg: "#c62828" },
    muted: { bg: "rgba(0,0,0,0.05)", fg: "var(--color-silver)" },
  };
  const c = map[tone] ?? map.muted;
  return (
    <span
      className="mono-tag inline-flex items-center whitespace-nowrap rounded px-2 py-0.5 text-[10px]"
      style={{ background: c.bg, color: c.fg }}
    >
      {children}
    </span>
  );
}

export function statusTone(s?: string | null) {
  const v = String(s ?? "").toLowerCase();
  if (["active", "approved", "paid", "succeeded", "resolved", "published", "customer"].includes(v))
    return "ok";
  if (["pending", "awaiting_payment", "draft", "issued", "scheduled", "paused", "open", "info_requested"].includes(v))
    return "warn";
  if (["rejected", "failed", "blocked", "suspended", "void", "lost", "closed"].includes(v)) return "bad";
  return "muted";
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-[640px] border-collapse text-[13px]">
        <thead>
          <tr>
            {head.map((h) => (
              <th
                key={h}
                className="mono-tag whitespace-nowrap px-2 py-2 text-left text-[10px]"
                style={{ color: "var(--color-silver)", borderBottom: "1px solid var(--color-hair)" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <td
      className={`px-2 py-2 align-middle ${className}`}
      style={{ borderBottom: "1px solid var(--color-hair)" }}
    >
      {children}
    </td>
  );
}

export function Empty({ label = "No records" }: { label?: string }) {
  return (
    <p className="py-8 text-center text-[13px]" style={{ color: "var(--color-silver)" }}>
      {label}
    </p>
  );
}

export function NotConnected({ what }: { what: string }) {
  return (
    <div
      className="p-4 text-[12px]"
      style={{
        border: "1px dashed var(--color-hair-strong)",
        borderRadius: 8,
        color: "var(--color-silver)",
      }}
    >
      <span className="mono-tag" style={{ color: "var(--color-heat)" }}>
        NOT CONNECTED
      </span>
      <span className="ml-2">{what}</span>
    </div>
  );
}

/** Lightweight dependency-free sparkline/bar chart. */
export function Bars({ data, currency = "USD" }: { data: { day: string; cents: number }[]; currency?: string }) {
  if (!data.length) return <Empty label="No transactions in range" />;
  const max = Math.max(...data.map((d) => d.cents), 1);
  return (
    <div className="flex h-32 items-end gap-[3px]">
      {data.map((d) => (
        <div key={d.day} className="group relative flex-1" title={`${d.day} · ${formatMoney(d.cents, currency)}`}>
          <div
            style={{
              height: `${Math.max(2, (d.cents / max) * 100)}%`,
              background: "var(--color-neon)",
              opacity: 0.85,
              borderRadius: 2,
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function Split({ data, currency = "USD" }: { data: { kind: string; cents: number }[]; currency?: string }) {
  const total = data.reduce((a, d) => a + d.cents, 0) || 1;
  if (!data.length) return <Empty label="No revenue in range" />;
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.kind}>
          <div className="flex items-center justify-between text-[12px]">
            <span className="mono-tag">{d.kind}</span>
            <span className="tabular-nums">{formatMoney(d.cents, currency)}</span>
          </div>
          <div className="mt-1 h-1.5 w-full rounded" style={{ background: "rgba(0,0,0,0.06)" }}>
            <div
              className="h-1.5 rounded"
              style={{ width: `${(d.cents / total) * 100}%`, background: "var(--color-neon)" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export const inputStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--color-hair-strong)",
  borderRadius: 6,
  color: "var(--color-ink)",
  padding: "8px 10px",
  fontSize: 13,
  width: "100%",
};
