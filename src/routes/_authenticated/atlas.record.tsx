import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { lazy, Suspense, useState } from "react";
import { RouteRecorder } from "@/components/RouteRecorder";
import { createRoute as createRouteFn, DIFFICULTIES, SURFACES } from "@/lib/routes.functions";

const RouteMap = lazy(() => import("@/components/RouteMap"));
type LatLng = { lat: number; lng: number };

export const Route = createFileRoute("/_authenticated/atlas/record")({
  head: () => ({
    meta: [
      { title: "Record route · ZOMBIEREX" },
      { name: "description", content: "Record a live GPS route and save it to your Atlas." },
    ],
  }),
  component: RecordPage,
});

function RecordPage() {
  const nav = useNavigate();
  const create = useServerFn(createRouteFn);
  const [saved, setSaved] = useState<{
    path: LatLng[];
    distance_m: number;
    duration_s: number;
  } | null>(null);
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [difficulty, setDifficulty] = useState<string>("moderate");
  const [surface, setSurface] = useState<string>("paved");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function publish() {
    if (!saved) return;
    if (title.trim().length < 3) {
      setErr("Title too short");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const r = await create({
        data: {
          title: title.trim(),
          description: null,
          visibility,
          difficulty: difficulty as any,
          surface: surface as any,
          region: null,
          cover_url: null,
          path: saved.path,
          distance_m: saved.distance_m,
          duration_s: saved.duration_s,
          source: "recorded",
          pois: [],
        } as any,
      });
      nav({ to: "/atlas/$id", params: { id: r.id } });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-svh pb-32">
      <div className="px-4 py-4 space-y-4">
        {!saved && <RouteRecorder onFinish={setSaved} />}
        {saved && (
          <>
            <Suspense fallback={<div className="h-56 w-full bg-graphite" />}>
              <RouteMap path={saved.path} className="h-56 w-full" />
            </Suspense>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="DIST" value={`${(saved.distance_m / 1000).toFixed(2)} KM`} />
              <Stat
                label="TIME"
                value={`${Math.floor(saved.duration_s / 60)}m ${saved.duration_s % 60}s`}
              />
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ride title"
              className="w-full bg-graphite p-3 text-white border border-white/10"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="bg-graphite p-3 text-white border border-white/10"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d.toUpperCase()}
                  </option>
                ))}
              </select>
              <select
                value={surface}
                onChange={(e) => setSurface(e.target.value)}
                className="bg-graphite p-3 text-white border border-white/10"
              >
                {SURFACES.map((s) => (
                  <option key={s} value={s}>
                    {s.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as any)}
              className="w-full bg-graphite p-3 text-white border border-white/10"
            >
              <option value="public">PUBLIC (in the Atlas)</option>
              <option value="private">PRIVATE (link only)</option>
            </select>
            {err && <p className="text-red-400 text-sm">{err}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSaved(null)}
                className="tap py-3 mono-caps text-xs font-bold text-white/80"
                style={{ border: "1px solid var(--color-hair-strong)" }}
              >
                DISCARD
              </button>
              <button
                onClick={publish}
                disabled={saving}
                className="tap py-3 mono-caps text-xs font-bold disabled:opacity-50"
                style={{ background: "var(--color-neon)", color: "var(--color-obsidian)" }}
              >
                {saving ? "SAVING…" : "PUBLISH"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-graphite p-2 text-center">
      <p className="mono-tag" style={{ color: "var(--color-titanium)", fontSize: 8 }}>
        {label}
      </p>
      <p className="mono-num text-sm font-bold text-white">{value}</p>
    </div>
  );
}
