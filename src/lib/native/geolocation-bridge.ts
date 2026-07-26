/**
 * Native geolocation bridge.
 *
 * On iOS/Android under Capacitor, the WebView's navigator.geolocation is
 * either unavailable or requires per-visit browser permission prompts that
 * bypass the OS-level location permission. We replace it with a shim that
 * forwards to @capacitor/geolocation so every existing caller
 * (navigator.geolocation.getCurrentPosition / watchPosition / clearWatch)
 * transparently uses the native permission and provider.
 *
 * No-op on web. Safe to call multiple times.
 */
import { isNative } from "./index";

let installed = false;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadPlugin<T = any>(name: string): Promise<T | null> {
  try {
    const mod = await import(/* @vite-ignore */ name);
    return mod as T;
  } catch {
    return null;
  }
}

type CapPosition = {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude: number | null;
    altitudeAccuracy: number | null;
    heading: number | null;
    speed: number | null;
  };
  timestamp: number;
};

type CapGeolocation = {
  requestPermissions: () => Promise<{ location: string }>;
  getCurrentPosition: (o?: { enableHighAccuracy?: boolean; timeout?: number }) => Promise<CapPosition>;
  watchPosition: (
    o: { enableHighAccuracy?: boolean; timeout?: number },
    cb: (pos: CapPosition | null, err?: { message: string }) => void,
  ) => Promise<string>;
  clearWatch: (o: { id: string }) => Promise<void>;
};

function toGeoPosition(p: CapPosition): GeolocationPosition {
  return {
    coords: {
      latitude: p.coords.latitude,
      longitude: p.coords.longitude,
      accuracy: p.coords.accuracy,
      altitude: p.coords.altitude,
      altitudeAccuracy: p.coords.altitudeAccuracy,
      heading: p.coords.heading,
      speed: p.coords.speed,
      toJSON() { return this; },
    } as GeolocationCoordinates,
    timestamp: p.timestamp,
    toJSON() { return this; },
  } as GeolocationPosition;
}

function toGeoError(msg: string, code = 2): GeolocationPositionError {
  return {
    code,
    message: msg,
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  } as GeolocationPositionError;
}

export async function installGeolocationBridge() {
  if (installed || !isNative() || typeof navigator === "undefined") return;
  const mod = await loadPlugin<{ Geolocation: CapGeolocation }>("@capacitor/geolocation");
  if (!mod) return;
  const Geo = mod.Geolocation;

  // Request permission up front so subsequent calls resolve without prompts.
  try { await Geo.requestPermissions(); } catch { /* ignore, will retry per-call */ }

  // Map numeric web watchIds -> native string ids so clearWatch(id) works.
  const watches = new Map<number, string>();
  let nextId = 1;

  const shim: Geolocation = {
    getCurrentPosition: (success, error, options) => {
      Geo.getCurrentPosition({
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        timeout: options?.timeout ?? 15000,
      })
        .then((p) => success(toGeoPosition(p)))
        .catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : "Location unavailable";
          error?.(toGeoError(msg));
        });
    },
    watchPosition: (success, error, options) => {
      const webId = nextId++;
      Geo.watchPosition(
        {
          enableHighAccuracy: options?.enableHighAccuracy ?? true,
          timeout: options?.timeout ?? 15000,
        },
        (pos, err) => {
          if (err) { error?.(toGeoError(err.message)); return; }
          if (pos) success(toGeoPosition(pos));
        },
      )
        .then((nativeId) => { watches.set(webId, nativeId); })
        .catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : "Location unavailable";
          error?.(toGeoError(msg));
        });
      return webId;
    },
    clearWatch: (id: number) => {
      const nativeId = watches.get(id);
      if (!nativeId) return;
      watches.delete(id);
      Geo.clearWatch({ id: nativeId }).catch(() => { /* ignore */ });
    },
  };

  try {
    Object.defineProperty(navigator, "geolocation", { value: shim, configurable: true });
    installed = true;
  } catch { /* ignore — leave web fallback */ }
}
