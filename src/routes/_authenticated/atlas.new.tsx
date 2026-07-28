import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { lazy, Suspense, useMemo, useRef, useState } from "react";
import { createRoute as createRouteFn, searchPlacesNearby, POI_KINDS, DIFFICULTIES, SURFACES } from "@/lib/routes.functions";
import { parseGpx, downloadGpx } from "@/lib/gpx";

const RouteMap = lazy(() => import("@/components/RouteMap"));

type LatLng = { lat: number; lng: number };
type Poi = { name: string; kind: string; lat: number; lng: number; address?: string | null; google_place_id?: string | null };

export const Route = createFileRoute("/_authenticated/atlas/new")({
  head: () => ({ meta: [
    { title: "New Route · ZOMBIEREX Atlas" },
    { name: "description", content: "Plan a new ride and share it with the community." },
    { property: "og:title", content: "New Route · ZOMBIEREX Atlas" },
    { property: "og:description", content: "Plan a new ride and share it with the community." },
  ] }),
  component: PlanPage,
});

function haversine(a: LatLng, b: LatLng) {
  const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function PlanPage() {
  const nav = useNavigate();
  const create = useServerFn(createRouteFn);
  const searchPois = useServerFn(searchPlacesNearby);
  const [path, setPath] = useState<LatLng[]>([]);
  const [pois, setPois] = useState<Poi[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [region, setRegion] = useState("");
  const [visibility, setVisibility] = useState<"public"|"private">("public");
  const [difficulty, setDifficulty] = useState<typeof DIFFICULTIES[number]>("moderate");
  const [surface, setSurface] = useState<typeof SURFACES[number]>("paved");
  const [searchKind, setSearchKind] = useState<string>("hotel");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const distance = useMemo(() => {
    let d = 0;
    for (let i = 1; i < path.length; i++) d += haversine(path[i-1], path[i]);
    return Math.round(d);
  }, [path]);

  function addPoint(p: LatLng) { setPath((prev) => [...prev, p]); }
  function undo() { setPath((prev) => prev.slice(0, -1)); }
  function clear() { setPath([]); setPois([]); }

  async function importGpx(file: File) {
    setErr(null);
    try {
      const text = await file.text();
      const parsed = parseGpx(text);
      if (!parsed.path.length) throw new Error("No track points found");
      setPath(parsed.path.map((p) => ({ lat: p.lat, lng: p.lng })));
      setPois(parsed.waypoints.map((w) => ({ name: w.name || "Waypoint", kind: "custom", lat: w.lat, lng: w.lng })));
      if (parsed.name && !title) setTitle(parsed.name.slice(0, 140));
    } catch (e: any) { setErr(e.message); }
  }
  function exportDraftGpx() {
    if (path.length < 2) { setErr("Add at least 2 waypoints"); return; }
    const gpx = buildGpx(title || "Draft Route", path, pois);
    downloadGpx(`${(title || "route").replace(/\s+/g, "_")}.gpx`, gpx);
  }

  async function findPlaces() {
    if (path.length === 0) { setErr("Add at least one waypoint first"); return; }
    setErr(null); setSearching(true);
    try {
      const mid = path[Math.floor(path.length / 2)];
      const res = await searchPois({ data: { lat: mid.lat, lng: mid.lng, kind: searchKind as any } });
      setSearchResults(res);
    } catch (e: any) { setErr(e.message); }
    finally { setSearching(false); }
  }

  function addPoi(r: any) {
    setPois((prev) => [...prev, { name: r.name, kind: searchKind, lat: r.lat, lng: r.lng, address: r.address, google_place_id: r.google_place_id }]);
  }

  async function save() {
    setErr(null);
    if (title.trim().length < 3) return setErr("Title too short");
    if (path.length < 2) return setErr("Add at least 2 waypoints");
    setSaving(true);
    try {
      const speedKmh = surface === "offroad" ? 40 : 65;
      const duration_s = Math.round(((distance / 1000) / speedKmh) * 3600);
      const r = await create({ data: {
        title: title.trim(), description: description.trim() || null,
        visibility, difficulty, surface, region: region.trim() || null,
        cover_url: null, path, distance_m: distance, duration_s, source: "planned",
        pois: pois.map((p, i) => ({ ...p, order_index: i })),
      } as any });
      nav({ to: "/atlas/$id", params: { id: r.id } });
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="min-h-svh pb-40">
      <Suspense fallback={<div className="h-72 w-full bg-graphite" />}>
        <RouteMap path={path} pois={pois} interactive onMapClick={addPoint} className="h-72 w-full" />
      </Suspense>
      <div className="px-4 pt-3 space-y-3">
        <p className="mono-tag" style={{ color: "var(--color-titanium)", fontSize: 10 }}>
          TAP MAP TO ADD WAYPOINTS · {path.length} POINTS · {(distance/1000).toFixed(2)} KM
        </p>
        <div className="flex gap-2">
          <button onClick={undo} disabled={!path.length} className="tap mono-caps text-[10px] font-bold px-3 py-2 text-white/80 disabled:opacity-30" style={{ border: "1px solid var(--color-hair-strong)" }}>UNDO</button>
          <button onClick={clear} disabled={!path.length} className="tap mono-caps text-[10px] font-bold px-3 py-2 text-white/80 disabled:opacity-30" style={{ border: "1px solid var(--color-hair-strong)" }}>CLEAR</button>
        </div>

        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Route title" className="w-full bg-graphite p-3 text-white border border-white/10" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" rows={3} className="w-full bg-graphite p-3 text-white border border-white/10" />
        <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Region (e.g. Hajar Mountains)" className="w-full bg-graphite p-3 text-white border border-white/10" />

        <div className="grid grid-cols-2 gap-2">
          <Select label="DIFFICULTY" value={difficulty} onChange={(v) => setDifficulty(v as any)} options={DIFFICULTIES as unknown as string[]} />
          <Select label="SURFACE" value={surface} onChange={(v) => setSurface(v as any)} options={SURFACES as unknown as string[]} />
        </div>
        <Select label="VISIBILITY" value={visibility} onChange={(v) => setVisibility(v as any)} options={["public","private"]} />

        <div className="mt-2 border-t border-white/10 pt-4">
          <p className="mono-caps text-[10px] font-bold" style={{ color: "var(--color-neon)" }}>ADD POINTS OF INTEREST</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {POI_KINDS.map((k) => (
              <button key={k} onClick={() => setSearchKind(k)} className="tap mono-caps text-[10px] font-bold px-2 py-1"
                style={{
                  background: searchKind===k ? "var(--color-neon)" : "transparent",
                  color: searchKind===k ? "var(--color-obsidian)" : "var(--color-titanium)",
                  border: "1px solid " + (searchKind===k ? "var(--color-neon)" : "var(--color-hair-strong)"),
                }}
              >{k.toUpperCase()}</button>
            ))}
          </div>
          <button onClick={findPlaces} disabled={searching || path.length===0} className="mt-2 tap mono-caps text-[10px] font-bold px-3 py-2 text-white disabled:opacity-40" style={{ background: "var(--color-graphite)", border: "1px solid var(--color-hair-strong)" }}>
            {searching ? "SEARCHING…" : "FIND NEARBY"}
          </button>
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-60 overflow-auto border border-white/10">
              {searchResults.map((r, i) => (
                <button key={i} onClick={() => addPoi(r)} className="tap block w-full text-left p-2 border-b border-white/5 hover:bg-white/5">
                  <p className="text-sm font-semibold text-white truncate">{r.name}</p>
                  {r.address && <p className="mono-tag truncate" style={{ color: "var(--color-titanium)", fontSize: 9 }}>{r.address}</p>}
                </button>
              ))}
            </div>
          )}
          {pois.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="mono-caps text-[10px]" style={{ color: "var(--color-titanium)" }}>ADDED ({pois.length})</p>
              {pois.map((p, i) => (
                <div key={i} className="flex items-center gap-2 border border-white/10 bg-graphite px-2 py-1">
                  <span className="mono-caps text-[9px]" style={{ color: "var(--color-neon)" }}>{p.kind}</span>
                  <span className="flex-1 truncate text-xs text-white">{p.name}</span>
                  <button onClick={() => setPois((prev) => prev.filter((_, j) => j !== i))} className="text-white/60 text-xs">×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {err && <p className="text-red-400 text-sm">{err}</p>}
        <button onClick={save} disabled={saving} className="tap w-full py-3 mono-caps text-sm font-bold disabled:opacity-50" style={{ background: "var(--color-neon)", color: "var(--color-obsidian)" }}>
          {saving ? "SAVING…" : "PUBLISH ROUTE"}
        </button>
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="mono-tag" style={{ color: "var(--color-titanium)", fontSize: 9 }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full bg-graphite p-3 text-white border border-white/10">
        {options.map((o) => <option key={o} value={o}>{o.toUpperCase()}</option>)}
      </select>
    </label>
  );
}
