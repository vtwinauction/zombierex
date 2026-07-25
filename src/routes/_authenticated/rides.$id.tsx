/**
 * Ride detail — replay map, stats, GPX export, edit title/notes, delete.
 */
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { lazy, Suspense, useState } from "react";
import { getRide, updateRide, deleteRide } from "@/lib/rides.functions";
import { ridePathToGpx, downloadGpx } from "@/lib/gpx";

const RouteMap = lazy(() => import("@/components/RouteMap"));

export const Route = createFileRoute("/_authenticated/rides/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Ride · ${params.id.slice(0, 8)} · ZOMBIEREX` },
      { name: "description", content: "Recorded ride telemetry — replay, stats, GPX export." },
    ],
  }),
  loader: ({ params }) => ({ id: params.id }),
  component: RideDetail,
  errorComponent: ({ error, reset }) => (
    <div className="p-6 text-foreground">
      <p className="text-sm text-red-500">Failed to load ride: {error.message}</p>
      <button onClick={reset} className="mt-3 border border-border px-3 py-1 text-xs">Retry</button>
    </div>
  ),
  notFoundComponent: () => <div className="p-6 text-foreground">Ride not found.</div>,
});

function RideDetail() {
  const { id } = Route.useLoaderData() as { id: string };
  const nav = useNavigate();
  const upd = useServerFn(updateRide);
  const del = useServerFn(deleteRide);
  const q = queryOptions({ queryKey: ["ride", id], queryFn: () => getRide({ data: { id } }) });
  const { data: r, refetch } = useSuspenseQuery(q);

  const [title, setTitle] = useState<string>(r.title ?? "");
  const [notes, setNotes] = useState<string>(r.notes ?? "");
  const [visibility, setVisibility] = useState<string>(r.visibility);
  const [saving, setSaving] = useState(false);

  const path = Array.isArray(r.path) ? (r.path as any[]).map((p) => ({ lat: p.lat, lng: p.lng })) : [];

  async function save() {
    setSaving(true);
    await upd({ data: { id, title: title || null, notes: notes || null, visibility: visibility as any } });
    await refetch();
    setSaving(false);
  }

  async function remove() {
    if (!confirm("Delete this ride?")) return;
    await del({ data: { id } });
    nav({ to: "/rides" });
  }

  function exportGpx() {
    const gpx = ridePathToGpx(title || "Ride", r.path as any[], r.started_at);
    downloadGpx(`ride-${id.slice(0, 8)}.gpx`, gpx);
  }

  return (
    <div className="min-h-svh pb-32">
      <Suspense fallback={<div className="h-64 w-full bg-graphite" />}>
        <RouteMap path={path} className="h-64 w-full" />
      </Suspense>
      <div className="px-4 py-4 space-y-4">
        <div className="grid grid-cols-4 gap-2">
          <Big label="KM" v={(r.distance_m / 1000).toFixed(1)} />
          <Big label="MIN" v={String(Math.round(r.duration_s / 60))} />
          <Big label="AVG" v={String(Math.round(r.avg_speed_kmh))} />
          <Big label="MAX" v={String(Math.round(r.max_speed_kmh))} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Big label="MOVE MIN" v={String(Math.round(r.moving_s / 60))} />
          <Big label="ELEV M" v={String(r.elev_gain_m)} />
          <Big label="POINTS" v={String((r.path as any[])?.length ?? 0)} />
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ride title" className="w-full bg-graphite p-3 text-sm" style={{ color: "var(--color-ink)", border: "1px solid var(--color-hair)" }} />
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes about this ride" rows={4} className="w-full bg-graphite p-3 text-sm" style={{ color: "var(--color-ink)", border: "1px solid var(--color-hair)" }} />
        <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="w-full bg-graphite p-3 text-sm" style={{ color: "var(--color-ink)", border: "1px solid var(--color-hair)" }}>
          <option value="private">PRIVATE (only you)</option>
          <option value="unlisted">UNLISTED (link only)</option>
          <option value="public">PUBLIC</option>
        </select>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={save} disabled={saving} className="tap py-3 mono-caps text-xs font-black disabled:opacity-50" style={{ background: "var(--color-neon)", color: "var(--color-obsidian)" }}>{saving ? "SAVING…" : "SAVE"}</button>
          <button onClick={exportGpx} className="tap py-3 mono-caps text-xs font-bold" style={{ border: "1px solid var(--color-hair-strong)", color: "var(--color-ink)" }}>EXPORT GPX</button>
          <button onClick={remove} className="tap py-3 mono-caps text-xs font-bold" style={{ border: "1px solid rgba(255,80,80,0.5)", color: "#ff6b6b" }}>DELETE</button>
        </div>
        <Link to="/rides" className="tap block w-full py-3 text-center mono-caps text-[10px] font-bold" style={{ color: "var(--color-silver)" }}>← ALL RIDES</Link>
      </div>
    </div>
  );
}

function Big({ label, v }: { label: string; v: string }) {
  return (
    <div className="border p-2 text-center" style={{ borderColor: "var(--color-hair)", background: "var(--color-graphite)" }}>
      <p className="mono-num text-lg font-black" style={{ color: "var(--color-ink)" }}>{v}</p>
      <p className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 8 }}>{label}</p>
    </div>
  );
}
