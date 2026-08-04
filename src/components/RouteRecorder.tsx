/**
 * RouteRecorder — foreground GPS tracker. Uses watchPosition only while mounted.
 * Downsamples points (min 15m between samples) so payloads stay small.
 */
import { useEffect, useRef, useState } from "react";
import { SpeedoHUD } from "@/components/SpeedoHUD";

type LatLng = { lat: number; lng: number };

function haversine(a: LatLng, b: LatLng) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function RouteRecorder({
  onFinish,
}: {
  onFinish: (data: { path: LatLng[]; distance_m: number; duration_s: number }) => void;
}) {
  const [tracking, setTracking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [path, setPath] = useState<LatLng[]>([]);
  const [distance, setDistance] = useState(0);
  const [start, setStart] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [err, setErr] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (!tracking || paused) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [tracking, paused]);

  function begin() {
    if (!("geolocation" in navigator)) {
      setErr("Geolocation not supported");
      return;
    }
    setTracking(true);
    setPaused(false);
    setStart((s) => s ?? Date.now());
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const p: LatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPath((prev) => {
          const last = prev[prev.length - 1];
          if (!last) return [p];
          const d = haversine(last, p);
          if (d < 15) return prev; // downsample
          setDistance((x) => x + d);
          return [...prev, p];
        });
      },
      (e) => setErr(e.message),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );
  }

  function pause() {
    setPaused(true);
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
  }

  function stopAndSave() {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setTracking(false);
    onFinish({
      path,
      distance_m: Math.round(distance),
      duration_s: start ? Math.round((Date.now() - start) / 1000) : 0,
    });
  }

  useEffect(
    () => () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    },
    [],
  );

  const dur = start ? Math.floor((now - start) / 1000) : 0;
  const speed = dur > 0 ? (distance / dur) * 3.6 : 0;

  return (
    <div className="space-y-3">
      {err && (
        <div className="border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-200">{err}</div>
      )}
      {tracking && (
        <div className="flex justify-center">
          <SpeedoHUD unit="kmh" />
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="DIST" value={`${(distance / 1000).toFixed(2)} km`} />
        <Stat label="TIME" value={fmtDur(dur)} />
        <Stat label="AVG" value={`${speed.toFixed(1)} km/h`} />
      </div>
      <div className="flex gap-2">
        {!tracking && (
          <button
            onClick={begin}
            className="tap flex-1 py-3 mono-caps text-sm font-bold"
            style={{ background: "var(--color-neon)", color: "var(--color-obsidian)" }}
          >
            START RIDE
          </button>
        )}
        {tracking && !paused && (
          <button
            onClick={pause}
            className="tap flex-1 py-3 mono-caps text-sm font-bold"
            style={{
              background: "var(--color-graphite)",
              color: "white",
              border: "1px solid var(--color-hair-strong)",
            }}
          >
            PAUSE
          </button>
        )}
        {tracking && paused && (
          <button
            onClick={begin}
            className="tap flex-1 py-3 mono-caps text-sm font-bold"
            style={{ background: "var(--color-neon)", color: "var(--color-obsidian)" }}
          >
            RESUME
          </button>
        )}
        {tracking && (
          <button
            onClick={stopAndSave}
            disabled={path.length < 2}
            className="tap flex-1 py-3 mono-caps text-sm font-bold disabled:opacity-40"
            style={{ background: "var(--color-heat)", color: "white" }}
          >
            STOP & SAVE
          </button>
        )}
      </div>
      <p className="mono-tag text-center" style={{ color: "var(--color-titanium)", fontSize: 9 }}>
        {path.length} pts logged · foreground only, close app to end
      </p>
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

function fmtDur(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}
