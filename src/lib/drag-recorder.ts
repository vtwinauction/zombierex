/**
 * DragRecorder — foreground GPS drag recorder with launch detection.
 * Samples at max cadence; auto-stops after 30s or when speed drops post-run.
 */
import { useEffect, useRef, useState } from "react";

export type DragPoint = {
  t_ms: number;
  lat: number;
  lng: number;
  speed_kmh?: number;
  accuracy_m?: number;
  altitude_m?: number;
  heading?: number;
};

export function useDragRecorder() {
  const [armed, setArmed] = useState(false);
  const [recording, setRecording] = useState(false);
  const [points, setPoints] = useState<DragPoint[]>([]);
  const [liveKmh, setLiveKmh] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const watchRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const lastMovingRef = useRef<number>(0);

  useEffect(() => () => stop(), []);

  function arm() {
    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported");
      return;
    }
    setError(null);
    setArmed(true);
    setPoints([]);
    setLiveKmh(0);
    startRef.current = null;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const spd = (pos.coords.speed ?? 0) * 3.6;
        setLiveKmh(spd);
        // Auto-start: speed crosses 8 km/h from stopped
        if (!recording && startRef.current === null && spd > 8) {
          startRef.current = pos.timestamp;
          setRecording(true);
        }
        if (startRef.current !== null) {
          const t_ms = pos.timestamp - startRef.current;
          const p: DragPoint = {
            t_ms,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            speed_kmh: spd,
            accuracy_m: pos.coords.accuracy ?? undefined,
            altitude_m: pos.coords.altitude ?? undefined,
            heading: pos.coords.heading ?? undefined,
          };
          setPoints((prev) => [...prev, p]);
          if (spd > 5) lastMovingRef.current = Date.now();
          // Auto-stop after 30s or 4s stopped after run
          if (t_ms > 30000 || (t_ms > 5000 && Date.now() - lastMovingRef.current > 4000)) {
            stop();
          }
        }
      },
      (e) => setError(e.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    );
  }

  function stop() {
    if (watchRef.current !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchRef.current);
    }
    watchRef.current = null;
    setArmed(false);
    setRecording(false);
  }

  function reset() {
    stop();
    setPoints([]);
    startRef.current = null;
  }

  return { armed, recording, points, liveKmh, error, arm, stop, reset };
}
