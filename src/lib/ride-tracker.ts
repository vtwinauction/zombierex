/**
 * Ride tracker — adaptive-throttle GPS recorder used by Ride Mode.
 * Battery-friendly: 1s cadence while moving, 10s while stopped.
 */
export type TrackPoint = { lat: number; lng: number; t: number; spd?: number; alt?: number };

export type TrackerState = {
  points: TrackPoint[];
  distance_m: number;
  duration_s: number;
  moving_s: number;
  avg_kmh: number;
  max_kmh: number;
  elev_gain_m: number;
  last_kmh: number;
  started_at: number;
};

export function emptyState(): TrackerState {
  return {
    points: [],
    distance_m: 0,
    duration_s: 0,
    moving_s: 0,
    avg_kmh: 0,
    max_kmh: 0,
    elev_gain_m: 0,
    last_kmh: 0,
    started_at: Date.now(),
  };
}

// Haversine in meters
export function haversine(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function ingest(state: TrackerState, pos: GeolocationPosition): TrackerState {
  const p: TrackPoint = {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    t: pos.timestamp,
    spd: pos.coords.speed ?? undefined,
    alt: pos.coords.altitude ?? undefined,
  };
  const prev = state.points[state.points.length - 1];
  const next: TrackerState = { ...state, points: [...state.points, p] };
  if (prev) {
    const meters = haversine(prev, p);
    // Filter GPS jitter under 3m
    if (meters >= 3) next.distance_m += meters;
    const dtS = Math.max(0.001, (p.t - prev.t) / 1000);
    const kmh = (meters / dtS) * 3.6;
    next.last_kmh = kmh;
    if (kmh > next.max_kmh && kmh < 400) next.max_kmh = kmh;
    if (kmh > 3) next.moving_s += dtS;
    if (typeof p.alt === "number" && typeof prev.alt === "number" && p.alt > prev.alt) {
      next.elev_gain_m += Math.round(p.alt - prev.alt);
    }
  }
  next.duration_s = Math.floor((Date.now() - next.started_at) / 1000);
  next.avg_kmh = next.moving_s > 0 ? (next.distance_m / next.moving_s) * 3.6 : 0;
  return next;
}

/** Manage the Wake Lock so the screen stays on while riding. */
export async function requestWakeLock(): Promise<WakeLockSentinel | null> {
  if (typeof navigator === "undefined") return null;
  const anyNav = navigator as any;
  if (!anyNav.wakeLock?.request) return null;
  try {
    return await anyNav.wakeLock.request("screen");
  } catch {
    return null;
  }
}
