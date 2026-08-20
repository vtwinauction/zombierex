import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getVehicleHealth, reviewBuild } from "@/lib/vehicle-ai.functions";

const GRADE_COLOR: Record<string, string> = {
  excellent: "var(--color-neon)",
  good: "var(--color-neon)",
  attention: "#e0a800",
  critical: "#e04141",
};

/** Compact health arc + REX build review for a vehicle the viewer owns. */
export function VehicleIntelligence({ vehicleId }: { vehicleId: string }) {
  const fetchHealth = useServerFn(getVehicleHealth);
  const review = useServerFn(reviewBuild);

  const health = useQuery({
    queryKey: ["garage", "health", vehicleId],
    queryFn: () => fetchHealth({ data: { id: vehicleId } }),
    retry: false,
  });

  const rex = useMutation({
    mutationFn: () => review({ data: { id: vehicleId } }),
  });

  const h = health.data;
  const color = h ? (GRADE_COLOR[h.grade] ?? "var(--color-neon)") : "var(--color-ink-3)";
  const pct = h ? h.score / 100 : 0;
  const R = 26;
  const C = 2 * Math.PI * R * 0.75; // 270° arc

  return (
    <section className="mt-8 px-4">
      <h2 className="mono-tag text-[11px]" style={{ color: "var(--color-ink-1)" }}>
        REX INTELLIGENCE
      </h2>

      <div
        className="mt-3 rounded-xl p-4"
        style={{ background: "var(--color-paper-0)", border: "1px solid var(--color-line)" }}
      >
        <div className="flex items-center gap-4">
          <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden>
            <circle
              cx="36"
              cy="36"
              r={R}
              fill="none"
              stroke="var(--color-line)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${C} 999`}
              transform="rotate(135 36 36)"
            />
            <circle
              cx="36"
              cy="36"
              r={R}
              fill="none"
              stroke={color}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${C * pct} 999`}
              transform="rotate(135 36 36)"
            />
            <text
              x="36"
              y="40"
              textAnchor="middle"
              fontSize="18"
              fill="var(--color-ink-0)"
              fontFamily="var(--font-mono, monospace)"
            >
              {h ? h.score : "–"}
            </text>
          </svg>

          <div className="min-w-0">
            <p className="mono-tag text-[10px]" style={{ color }}>
              {h ? `HEALTH · ${h.grade.toUpperCase()}` : "HEALTH · —"}
            </p>
            <p className="mt-1 text-[13px]" style={{ color: "var(--color-ink-2)" }}>
              {h?.daysSinceLastService === null || h?.daysSinceLastService === undefined
                ? "No service history logged yet."
                : `Last service ${h.daysSinceLastService} days ago${
                    h.lastOdometerKm ? ` · ${h.lastOdometerKm.toLocaleString()} km` : ""
                  }.`}
            </p>
            <p className="mt-0.5 text-[12px]" style={{ color: "var(--color-ink-3)" }}>
              {h?.currentOdometerKm != null
                ? `Odometer ${Math.round(h.currentOdometerKm).toLocaleString()} km`
                : "Odometer not tracked"}
            </p>
          </div>
        </div>

        {h && h.items.length > 0 && (
          <ul className="mt-4 space-y-2">
            {h.items.slice(0, 5).map((it) => (
              <li key={it.id} className="flex items-center justify-between gap-3">
                <span className="truncate text-[13px]" style={{ color: "var(--color-ink-1)" }}>
                  {it.title}
                </span>
                <span
                  className="mono-tag shrink-0 text-[10px]"
                  style={{
                    color:
                      it.severity === "overdue"
                        ? "#e04141"
                        : it.severity === "due-soon"
                          ? "#e0a800"
                          : "var(--color-ink-3)",
                  }}
                >
                  {dueLabel(it)}
                </span>
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={() => rex.mutate()}
          disabled={rex.isPending}
          className="mono-tag mt-4 w-full rounded-lg py-2 text-[10px]"
          style={{ border: `1px solid ${color}`, color, opacity: rex.isPending ? 0.6 : 1 }}
        >
          {rex.isPending ? "ANALYSING…" : rex.data ? "RE-RUN BUILD REVIEW" : "RUN BUILD REVIEW"}
        </button>

        {rex.isError && (
          <p className="mt-2 text-[12px]" style={{ color: "#e04141" }}>
            {(rex.error as Error).message}
          </p>
        )}

        {rex.data && (
          <div className="mt-4 space-y-3">
            {rex.data.summary && (
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-ink-1)" }}>
                {rex.data.summary}
              </p>
            )}
            <Bullets label="STRENGTHS" items={rex.data.strengths} />
            <Bullets label="GAPS" items={rex.data.gaps} />
            <Bullets label="NEXT MODS" items={rex.data.nextMods} />
            <Bullets label="MAINTENANCE" items={rex.data.maintenance} />
          </div>
        )}
      </div>
    </section>
  );
}

function dueLabel(it: { daysUntilDue: number | null; kmUntilDue: number | null }): string {
  const parts: string[] = [];
  if (it.daysUntilDue !== null)
    parts.push(it.daysUntilDue < 0 ? `${-it.daysUntilDue}D OVERDUE` : `${it.daysUntilDue}D`);
  if (it.kmUntilDue !== null)
    parts.push(
      it.kmUntilDue < 0
        ? `${(-it.kmUntilDue).toLocaleString()}KM OVER`
        : `${it.kmUntilDue.toLocaleString()}KM`,
    );
  return parts.join(" · ") || "SCHEDULED";
}

function Bullets({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="mono-tag text-[10px]" style={{ color: "var(--color-ink-3)" }}>
        {label}
      </p>
      <ul className="mt-1 space-y-1">
        {items.map((t, i) => (
          <li key={i} className="text-[13px]" style={{ color: "var(--color-ink-1)" }}>
            · {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
