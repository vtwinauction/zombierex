/**
 * Drag — Performance record detail. Permanent digital record of a verified run.
 */
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getDragRun } from "@/lib/drag.functions";

export const Route = createFileRoute("/_authenticated/drag/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Drag Run · ${params.id.slice(0, 8)} · ZOMBIEREX` },
      { name: "description", content: "GPS-verified drag racing performance record." },
    ],
  }),
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(
      queryOptions({
        queryKey: ["drag", params.id],
        queryFn: () => getDragRun({ data: { id: params.id } }),
      }),
    ),
  component: RunDetail,
});

function RunDetail() {
  const { id } = Route.useParams();
  const { data: r } = useSuspenseQuery(
    queryOptions({ queryKey: ["drag", id], queryFn: () => getDragRun({ data: { id } }) }),
  );
  const statusColor =
    r.status === "verified"
      ? "var(--color-neon)"
      : r.status === "flagged"
        ? "#ff8c1a"
        : r.status === "rejected"
          ? "#ff4d4d"
          : "var(--color-silver)";
  return (
    <div className="min-h-svh pb-24">
      <div className="px-4 pt-4">
        <p className="mono-caps text-[10px] font-black" style={{ color: statusColor }}>
          {String(r.status).toUpperCase()} · SCORE {r.verification_score ?? "—"}
        </p>
        <h1 className="serif text-3xl" style={{ color: "var(--color-ink)" }}>
          {r.vehicle_name || (r.vehicle_kind === "motorcycle" ? "Motorcycle" : "Car")}
        </h1>
        <p className="mt-1 text-xs" style={{ color: "var(--color-ink-3)" }}>
          {new Date(r.created_at).toLocaleString()}
        </p>

        <h2
          className="mono-caps mt-6 text-[10px] font-black"
          style={{ color: "var(--color-silver)" }}
        >
          PERFORMANCE SPLITS
        </h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Split label="0–60 km/h" value={r.zero_to_60_kmh_s} unit="s" />
          <Split label="0–100 km/h" value={r.zero_to_100_kmh_s} unit="s" />
          <Split label="60–120 km/h" value={r.sixty_to_120_kmh_s} unit="s" />
          <Split
            label="1/8 mile"
            value={r.eighth_mile_s}
            unit="s"
            sub={
              r.eighth_mile_trap_kmh
                ? `${Number(r.eighth_mile_trap_kmh).toFixed(1)} trap`
                : undefined
            }
          />
          <Split
            label="1/4 mile"
            value={r.quarter_mile_s}
            unit="s"
            sub={
              r.quarter_mile_trap_kmh
                ? `${Number(r.quarter_mile_trap_kmh).toFixed(1)} trap`
                : undefined
            }
          />
          <Split label="Top speed" value={r.top_speed_kmh} unit="km/h" digits={1} />
          <Split label="Reaction" value={r.reaction_time_s} unit="s" />
          <Split label="Launch" value={r.launch_g} unit="g" digits={2} />
        </div>

        <h2
          className="mono-caps mt-6 text-[10px] font-black"
          style={{ color: "var(--color-silver)" }}
        >
          VEHICLE
        </h2>
        <div
          className="mt-2 rounded-lg border p-3"
          style={{ borderColor: "var(--color-hair)", background: "var(--color-graphite)" }}
        >
          <Row k="Type" v={r.vehicle_kind === "motorcycle" ? "Motorcycle" : "Car"} />
          <Row k="Engine" v={r.engine_cc ? `${r.engine_cc} cc` : "—"} />
          <Row k="Aspiration" v={r.aspiration ? String(r.aspiration).toUpperCase() : "—"} />
          <Row k="Fuel" v={r.fuel_type ? String(r.fuel_type).toUpperCase() : "—"} />
          <Row
            k="Weight"
            v={
              r.weight_kg
                ? `${r.weight_kg} kg${r.weight_class ? ` · ${r.weight_class}` : ""}`
                : r.weight_class || "—"
            }
          />
          <Row k="Mods" v={r.modifications || "—"} />
        </div>

        <h2
          className="mono-caps mt-6 text-[10px] font-black"
          style={{ color: "var(--color-silver)" }}
        >
          VERIFICATION
        </h2>
        <div
          className="mt-2 rounded-lg border p-3"
          style={{ borderColor: "var(--color-hair)", background: "var(--color-graphite)" }}
        >
          <Row k="Status" v={String(r.status).toUpperCase()} />
          <Row
            k="Score"
            v={r.verification_score ? `${Number(r.verification_score).toFixed(0)} / 100` : "—"}
          />
          <Row k="GPS distance" v={r.distance_m ? `${Number(r.distance_m).toFixed(0)} m` : "—"} />
          <Row k="Duration" v={r.duration_s ? `${Number(r.duration_s).toFixed(2)} s` : "—"} />
          {r.anti_cheat_notes && <Row k="Notes" v={r.anti_cheat_notes} />}
        </div>

        <p
          className="mono-tag mt-4 text-center"
          style={{ color: "var(--color-silver)", fontSize: 9 }}
        >
          Permanent record · id {r.id.slice(0, 8)}
        </p>
      </div>
    </div>
  );
}

function Split({
  label,
  value,
  unit,
  digits,
  sub,
}: {
  label: string;
  value: any;
  unit: string;
  digits?: number;
  sub?: string;
}) {
  const v = value != null && value !== "" ? Number(value) : null;
  const d = digits ?? (unit === "s" ? 3 : 2);
  return (
    <div
      className="rounded-lg border p-3"
      style={{ borderColor: "var(--color-hair)", background: "var(--color-graphite)" }}
    >
      <p className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 9 }}>
        {label.toUpperCase()}
      </p>
      <p className="mono-num mt-1 text-lg font-bold" style={{ color: "var(--color-ink)" }}>
        {v != null ? `${v.toFixed(d)} ${unit}` : "—"}
      </p>
      {sub && (
        <p className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 8 }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-white/5 py-1.5 text-sm last:border-0">
      <span style={{ color: "var(--color-ink-3)" }}>{k}</span>
      <span style={{ color: "var(--color-ink)" }} className="text-right">
        {v}
      </span>
    </div>
  );
}
