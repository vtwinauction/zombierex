/**
 * Ride Mode — distraction-free fullscreen HUD for live riding.
 * Turn-by-turn guidance, big speedo, voice cues, wake-lock, one-tap save.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { planRoute } from "@/lib/nav.functions";
import { createRide } from "@/lib/rides.functions";
import {
  emptyState,
  ingest,
  requestWakeLock,
  type TrackerState,
  haversine,
} from "@/lib/ride-tracker";
import { speak, cancelSpeech, isSpeechSupported } from "@/lib/voice";
import { getFuelPrefs } from "@/lib/fuel-prefs";
import { Fuel as FuelIcon } from "lucide-react";

const RouteMap = lazy(() => import("@/components/RouteMap"));

type LatLng = { lat: number; lng: number };
type Step = {
  instruction: string;
  maneuver: string;
  distance_m: number;
  start: LatLng | null;
  end: LatLng | null;
};

export const Route = createFileRoute("/_authenticated/atlas/ride")({
  head: () => ({
    meta: [
      { title: "Ride Mode · ZOMBIEREX" },
      {
        name: "description",
        content: "Fullscreen turn-by-turn navigation, voice cues, and live ride recording.",
      },
    ],
  }),
  component: RideMode,
});

function RideMode() {
  const nav = useNavigate();
  const plan = useServerFn(planRoute);
  const saveRide = useServerFn(createRide);

  const [dest, setDest] = useState<LatLng | null>(null);
  const [avoidHwy, setAvoidHwy] = useState(true);
  const [avoidToll, setAvoidToll] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [routePoly, setRoutePoly] = useState<LatLng[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [totalEta, setTotalEta] = useState<{ dist: number; dur: number }>({ dist: 0, dur: 0 });
  const [voiceOn, setVoiceOn] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pickMode, setPickMode] = useState(true);

  const [pos, setPos] = useState<LatLng | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [tracker, setTracker] = useState<TrackerState>(() => emptyState());
  const trackerRef = useRef(tracker);
  trackerRef.current = tracker;

  const wakeRef = useRef<WakeLockSentinel | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const spokenStepRef = useRef<number>(-1);
  const recenterRef = useRef(0);

  // Start GPS + wake lock
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setErr("Location not available on this device.");
      return;
    }
    requestWakeLock().then((w) => (wakeRef.current = w));
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const ll = { lat: p.coords.latitude, lng: p.coords.longitude };
        setPos(ll);
        if (typeof p.coords.heading === "number" && !Number.isNaN(p.coords.heading))
          setHeading(p.coords.heading);
        setTracker((t) => ingest(t, p));
      },
      (e) => setErr(e.message),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    );
    watchIdRef.current = id;
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      wakeRef.current?.release().catch(() => {});
      cancelSpeech();
    };
  }, []);

  // Voice each new step + auto-advance when within 40m of step end
  useEffect(() => {
    if (!steps.length || !pos) return;
    const cur = steps[stepIdx];
    if (!cur) return;
    if (voiceOn && spokenStepRef.current !== stepIdx) {
      spokenStepRef.current = stepIdx;
      speak(stripHtml(cur.instruction || "Continue"));
    }
    if (cur.end && haversine(pos, cur.end) < 40 && stepIdx < steps.length - 1) {
      setStepIdx((i) => i + 1);
    }
  }, [pos, stepIdx, steps, voiceOn]);

  async function computeRoute() {
    if (!pos || !dest) {
      setErr("Set a destination");
      return;
    }
    setErr(null);
    const r = await plan({
      data: {
        origin: pos,
        destination: dest,
        avoid_highways: avoidHwy,
        avoid_tolls: avoidToll,
        avoid_unpaved: false,
      },
    });
    if (r.error) {
      setErr(r.error);
      return;
    }
    setSteps(r.steps as Step[]);
    setRoutePoly(decodePolyline(r.polyline));
    setTotalEta({ dist: r.distance_m, dur: r.duration_s });
    setStepIdx(0);
    setPickMode(false);
    if (voiceOn)
      speak(
        `Route ready. ${Math.round(r.distance_m / 1000)} kilometers, ${Math.round(r.duration_s / 60)} minutes.`,
      );
  }

  async function endRide() {
    if (trackerRef.current.points.length < 2) {
      nav({ to: "/atlas" });
      return;
    }
    setSaving(true);
    try {
      const t = trackerRef.current;
      const r = await saveRide({
        data: {
          title: null,
          notes: null,
          path: t.points.map((p) => ({ lat: p.lat, lng: p.lng, t: p.t, spd: p.spd, alt: p.alt })),
          distance_m: Math.round(t.distance_m),
          duration_s: t.duration_s,
          moving_s: Math.round(t.moving_s),
          avg_speed_kmh: Number(t.avg_kmh.toFixed(2)),
          max_speed_kmh: Number(t.max_kmh.toFixed(2)),
          elev_gain_m: t.elev_gain_m,
          started_at: new Date(t.started_at).toISOString(),
          ended_at: new Date().toISOString(),
          visibility: "private",
        } as any,
      });
      nav({ to: "/rides/$id", params: { id: r.id } });
    } catch (e: any) {
      setErr(e.message);
      setSaving(false);
    }
  }

  const cur = steps[stepIdx];
  const nextStep = steps[stepIdx + 1];
  const distToStep = pos && cur?.end ? haversine(pos, cur.end) : 0;

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: "#0b0d10", color: "#fff", zIndex: 60 }}
    >
      {/* Map */}
      <div className="relative flex-1">
        <Suspense fallback={<div className="h-full w-full bg-graphite" />}>
          <RouteMap
            className="h-full w-full"
            path={routePoly}
            userLocation={pos}
            userHeading={heading}
            recenterKey={recenterRef.current}
            interactive={pickMode}
            onMapClick={(p) => {
              if (pickMode) setDest(p);
            }}
          />
        </Suspense>

        {/* Top guidance card */}
        {!pickMode && cur && (
          <div className="absolute left-3 right-3 top-3 rounded-2xl border border-white/10 bg-black/70 p-4 backdrop-blur-md">
            <div className="flex items-start gap-3">
              <div
                className="grid h-14 w-14 shrink-0 place-items-center rounded-xl"
                style={{ background: "var(--color-neon)", color: "#0b0d10" }}
              >
                <span className="text-2xl font-black">{maneuverGlyph(cur.maneuver)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="mono-num text-3xl font-bold leading-none">
                  {formatDist(distToStep || cur.distance_m)}
                </p>
                <p className="mt-1 truncate text-sm text-white/90">{stripHtml(cur.instruction)}</p>
                {nextStep && (
                  <p className="mt-1 truncate text-[11px] text-white/50">
                    Then · {stripHtml(nextStep.instruction)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {!pickMode && (
          <FuelWarning distanceM={tracker.distance_m} onSpoke={(msg) => voiceOn && speak(msg)} />
        )}

        {/* Pick destination banner */}
        {pickMode && (
          <div className="absolute left-3 right-3 top-3 rounded-2xl border border-white/10 bg-black/75 p-4 backdrop-blur-md">
            <p className="mono-tag" style={{ color: "var(--color-neon)" }}>
              ◆ RIDE MODE
            </p>
            <h2 className="mt-1 text-lg font-bold">Tap the map to set destination</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <Toggle on={avoidHwy} onChange={setAvoidHwy}>
                Avoid highways
              </Toggle>
              <Toggle on={avoidToll} onChange={setAvoidToll}>
                Avoid tolls
              </Toggle>
              <Toggle on={voiceOn} onChange={setVoiceOn}>
                Voice
              </Toggle>
            </div>
            <div className="mt-3 flex gap-2">
              <Link
                to="/atlas"
                className="tap flex-1 rounded-lg border border-white/15 py-2 text-center text-xs font-bold"
              >
                CANCEL
              </Link>
              <button
                disabled={!dest || !pos}
                onClick={computeRoute}
                className="tap flex-1 rounded-lg py-2 text-center text-xs font-black disabled:opacity-40"
                style={{ background: "var(--color-neon)", color: "#0b0d10" }}
              >
                START NAV
              </button>
            </div>
            {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
          </div>
        )}

        {/* Recenter */}
        <button
          onClick={() => ((recenterRef.current += 1), setStepIdx((i) => i))}
          className="absolute right-3 bottom-32 grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-black/70 backdrop-blur-md"
          aria-label="Recenter"
        >
          <span className="text-lg">◎</span>
        </button>
      </div>

      {/* Bottom HUD */}
      <div
        className="grid grid-cols-4 gap-px border-t border-white/10"
        style={{ background: "#0b0d10" }}
      >
        <Stat label="SPEED" value={`${Math.round(tracker.last_kmh)}`} unit="KM/H" big />
        <Stat label="DIST" value={(tracker.distance_m / 1000).toFixed(1)} unit="KM" />
        <Stat label="TIME" value={fmtDur(tracker.duration_s)} />
        <Stat label="ETA" value={totalEta.dur ? fmtDur(totalEta.dur) : "—"} />
      </div>
      <div className="grid grid-cols-3 gap-2 border-t border-white/10 p-3">
        <button
          onClick={() => {
            setPickMode(true);
            setSteps([]);
            setRoutePoly([]);
            cancelSpeech();
          }}
          className="tap rounded-lg border border-white/15 py-3 text-xs font-bold"
        >
          {steps.length ? "CHANGE ROUTE" : "SET DEST"}
        </button>
        <button
          onClick={() => setVoiceOn((v) => !v)}
          className="tap rounded-lg border border-white/15 py-3 text-xs font-bold"
        >
          {voiceOn ? "MUTE 🔊" : "UNMUTE 🔇"}
        </button>
        <button
          onClick={endRide}
          disabled={saving}
          className="tap rounded-lg py-3 text-xs font-black disabled:opacity-40"
          style={{ background: "#ff3d3d", color: "#fff" }}
        >
          {saving ? "SAVING…" : "END & SAVE"}
        </button>
      </div>
      {!isSpeechSupported() && voiceOn && (
        <p className="border-t border-white/10 p-2 text-center text-[10px] text-white/50">
          Voice not supported on this browser.
        </p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  big,
}: {
  label: string;
  value: string;
  unit?: string;
  big?: boolean;
}) {
  return (
    <div className="p-3 text-center" style={{ background: "#0b0d10" }}>
      <p className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 9 }}>
        {label}
      </p>
      <p
        className={`mono-num font-black ${big ? "text-4xl" : "text-2xl"}`}
        style={{ color: "var(--color-neon)" }}
      >
        {value}
      </p>
      {unit && <p className="mono-tag text-[9px] text-white/50">{unit}</p>}
    </div>
  );
}

function Toggle({
  on,
  onChange,
  children,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="tap rounded-full border px-3 py-1 font-bold"
      style={{
        borderColor: on ? "var(--color-neon)" : "rgba(255,255,255,0.2)",
        color: on ? "var(--color-neon)" : "#fff",
      }}
    >
      {children}
    </button>
  );
}

function stripHtml(s: string) {
  return (s || "").replace(/<[^>]+>/g, "");
}
function formatDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}
function fmtDur(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}`;
  return `${m}:${String(ss).padStart(2, "0")}`;
}
function maneuverGlyph(m: string) {
  const k = (m || "").toLowerCase();
  if (k.includes("left")) return "↰";
  if (k.includes("right")) return "↱";
  if (k.includes("uturn") || k.includes("u_turn")) return "↺";
  if (k.includes("roundabout")) return "⟳";
  if (k.includes("merge")) return "⇢";
  if (k.includes("destination") || k.includes("arrive")) return "◉";
  return "↑";
}

// Google encoded polyline decoder
function decodePolyline(str: string): LatLng[] {
  if (!str) return [];
  const points: LatLng[] = [];
  let index = 0,
    lat = 0,
    lng = 0;
  while (index < str.length) {
    let b = 0,
      shift = 0,
      result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

function FuelWarning({
  distanceM,
  onSpoke,
}: {
  distanceM: number;
  onSpoke: (msg: string) => void;
}) {
  const prefs = useMemo(() => getFuelPrefs(), []);
  const consumedL = distanceM / 1000 / Math.max(prefs.economyKmPerL, 1);
  const litresLeft = Math.max(0, (prefs.tankCapacityL * prefs.currentPct) / 100 - consumedL);
  const kmLeft = Math.round(litresLeft * prefs.economyKmPerL);
  const low = kmLeft <= prefs.warnKm && kmLeft > 0;
  const empty = kmLeft <= 0;
  const firedRef = useRef(false);
  useEffect(() => {
    if ((low || empty) && !firedRef.current) {
      firedRef.current = true;
      onSpoke(
        empty
          ? "Fuel critical. Find a station now."
          : `Low fuel. Approximately ${kmLeft} kilometers remaining.`,
      );
    }
  }, [low, empty, kmLeft, onSpoke]);
  if (!low && !empty) return null;
  return (
    <Link
      to="/atlas/fuel"
      className="absolute left-3 right-3 bottom-3 flex items-center gap-3 rounded-xl border p-3 backdrop-blur-md"
      style={{ background: "rgba(60,0,0,0.85)", borderColor: "rgba(255,80,80,0.5)" }}
    >
      <FuelIcon className="h-5 w-5 text-red-300" />
      <div className="flex-1">
        <p className="text-xs font-bold uppercase tracking-wider text-red-200">
          {empty ? "Fuel critical" : "Low fuel"}
        </p>
        <p className="text-sm font-semibold text-white">~{kmLeft} km left · tap to find stations</p>
      </div>
    </Link>
  );
}
