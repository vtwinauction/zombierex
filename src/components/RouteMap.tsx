/**
 * RouteMap — thin wrapper around Google Maps JS API.
 * Loads only in the browser (behind <ClientOnly>), never during SSR.
 * Emits map clicks and exposes ref-free onReady for parents that need the map.
 */
import { useEffect, useRef, useState } from "react";

type LatLng = { lat: number; lng: number };
type Poi = { lat: number; lng: number; name?: string; kind?: string };
type CommunityPoi = { id?: string; lat: number; lng: number; name?: string; kind?: string };

let loaderPromise: Promise<any> | null = null;
const GOOGLE_MAPS_BROWSER_KEY_FALLBACK = "AIzaSyBmvJph4LmrbtW7skeczzpBIyb9WWzFKo4";

/** Google renders its own grey "Oops!" overlay when the key is rejected.
 *  We intercept gm_authFailure so the branded canvas fallback shows instead. */
let mapsAuthFailed = false;
const authFailListeners = new Set<() => void>();
export function onMapsAuthFailure(fn: () => void) {
  authFailListeners.add(fn);
  return () => {
    authFailListeners.delete(fn);
  };
}
export function mapsAuthHasFailed() {
  return mapsAuthFailed;
}

function loadGoogleMaps(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if ((window as any).google?.maps) return Promise.resolve((window as any).google);
  if (loaderPromise) return loaderPromise;
  const key = (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string) || GOOGLE_MAPS_BROWSER_KEY_FALLBACK;
  const channel = (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string) || "";
  if (!key) return Promise.reject(new Error("Missing maps key"));
  (window as any).gm_authFailure = () => {
    mapsAuthFailed = true;
    authFailListeners.forEach((fn) => fn());
  };
  loaderPromise = new Promise((resolve, reject) => {
    (window as any).__rexInitMap = () => resolve((window as any).google);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__rexInitMap${channel ? `&channel=${channel}` : ""}&libraries=places`;
    s.async = true;
    s.onerror = () => reject(new Error("Google Maps failed to load"));
    window.setTimeout(() => {
      if (!(window as any).google?.maps) reject(new Error("Map tiles are still loading"));
    }, 7000);
    document.head.appendChild(s);
  });
  return loaderPromise;
}


export function RouteMap({
  path = [],
  pois = [],
  communityPois = [],
  onCommunityPoiClick,
  center,
  zoom = 8,
  interactive = true,
  onMapClick,
  className = "h-72 w-full",
  theme = "dark",
  userLocation,
  userHeading,
  recenterKey,
}: {
  path?: LatLng[];
  pois?: Poi[];
  communityPois?: CommunityPoi[];
  onCommunityPoiClick?: (p: CommunityPoi) => void;
  center?: LatLng;
  zoom?: number;
  interactive?: boolean;
  onMapClick?: (p: LatLng) => void;
  className?: string;
  theme?: "dark" | "light";
  userLocation?: LatLng | null;
  userHeading?: number | null;
  recenterKey?: number;
}) {

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const userMarkerRef = useRef<any>(null);
  const communityMarkersRef = useRef<any[]>([]);

  // Key rejected (referrer/billing) → swap to the offline canvas map.
  useEffect(() => {
    if (mapsAuthHasFailed()) setErr("Map key rejected for this domain");
    return onMapsAuthFailure(() => setErr("Map key rejected for this domain"));
  }, []);



  // init
  useEffect(() => {
    let cancelled = false;
    
    loadGoogleMaps().then((g) => {
      if (cancelled || !containerRef.current) return;
      const first = path[0] ?? center ?? userLocation ?? { lat: 25.2048, lng: 55.2708 };
      mapRef.current = new g.maps.Map(containerRef.current, {
        center: first,
        zoom,
        disableDefaultUI: !interactive,
        gestureHandling: interactive ? "greedy" : "cooperative",
        clickableIcons: false,
        styles: theme === "light" ? [
          { featureType: "poi", stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "off" }] },
        ] : [
          { elementType: "geometry", stylers: [{ color: "#0f1114" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#8a8f98" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#0b0d10" }] },
          { featureType: "road", elementType: "geometry", stylers: [{ color: "#1c1f24" }] },
          { featureType: "water", elementType: "geometry", stylers: [{ color: "#05070a" }] },
          { featureType: "poi", stylers: [{ visibility: "off" }] },
        ],
      });

      if (onMapClick && interactive) {
        mapRef.current.addListener("click", (e: any) => {
          const lat = e.latLng.lat(); const lng = e.latLng.lng();
          onMapClick({ lat, lng });
        });
      }
      drawPath(g);
      drawPois(g);
      drawCommunity(g);
      drawUser(g);
    }).catch((e) => { console.error("[RouteMap] err", e); setErr(e.message); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // redraw when data changes
  useEffect(() => {
    if (!(window as any).google?.maps || !mapRef.current) return;
    drawPath((window as any).google);
    drawPois((window as any).google);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, pois]);

  useEffect(() => {
    if (!(window as any).google?.maps || !mapRef.current) return;
    drawCommunity((window as any).google);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityPois]);

  // user location updates
  useEffect(() => {
    if (!(window as any).google?.maps || !mapRef.current) return;
    drawUser((window as any).google);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation, userHeading]);

  // external recenter to user
  useEffect(() => {
    if (recenterKey === undefined) return;
    if (!mapRef.current || !userLocation) return;
    mapRef.current.panTo(userLocation);
    mapRef.current.setZoom(15);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterKey]);

  function drawPath(g: any) {
    if (polylineRef.current) polylineRef.current.setMap(null);
    if (!path.length) return;
    polylineRef.current = new g.maps.Polyline({
      path,
      strokeColor: "#c6ff3d",
      strokeOpacity: 0.95,
      strokeWeight: 4,
      map: mapRef.current,
    });
    // fit bounds
    if (path.length > 1) {
      const b = new g.maps.LatLngBounds();
      path.forEach((p) => b.extend(p));
      mapRef.current.fitBounds(b, 40);
    } else {
      mapRef.current.setCenter(path[0]);
    }
  }

  function drawPois(g: any) {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    pois.forEach((p) => {
      const m = new g.maps.Marker({
        position: { lat: p.lat, lng: p.lng },
        map: mapRef.current,
        title: p.name ?? "",
        label: p.kind ? { text: iconForKind(p.kind), color: "#0b0d10", fontSize: "12px", fontWeight: "700" } : undefined,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: "#c6ff3d",
          fillOpacity: 1,
          strokeColor: "#0b0d10",
          strokeWeight: 2,
        },
      });
      markersRef.current.push(m);
    });
  }

  function drawCommunity(g: any) {
    communityMarkersRef.current.forEach((m) => m.setMap(null));
    communityMarkersRef.current = [];
    communityPois.forEach((p) => {
      const m = new g.maps.Marker({
        position: { lat: p.lat, lng: p.lng },
        map: mapRef.current,
        title: p.name ?? "",
        label: p.kind ? { text: iconForKind(p.kind), color: "#ffffff", fontSize: "11px", fontWeight: "700" } : undefined,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 11,
          fillColor: "#2563eb",
          fillOpacity: 0.95,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        zIndex: 500,
      });
      if (onCommunityPoiClick) {
        m.addListener("click", () => onCommunityPoiClick(p));
      }
      communityMarkersRef.current.push(m);
    });
  }

  function drawUser(g: any) {
    if (userMarkerRef.current) { userMarkerRef.current.setMap(null); userMarkerRef.current = null; }
    if (!userLocation) return;
    const heading = typeof userHeading === "number" ? userHeading : null;
    userMarkerRef.current = new g.maps.Marker({
      position: userLocation,
      map: mapRef.current,
      zIndex: 999,
      icon: heading !== null
        ? {
            path: "M0,-14 L8,10 L0,4 L-8,10 Z",
            fillColor: "#22c55e",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
            scale: 1,
            rotation: heading,
            anchor: new g.maps.Point(0, 0),
          }
        : {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: "#22c55e",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 3,
          },
    });
  }

  if (err) {
    return <FallbackRouteMap className={className} path={path} pois={pois} communityPois={communityPois} userLocation={userLocation} />;
  }
  return <LiveMapShell containerRef={containerRef} className={className} path={path} pois={pois} communityPois={communityPois} userLocation={userLocation} />;
}

function iconForKind(k: string) {
  const map: Record<string, string> = { hotel: "H", food: "F", fuel: "⛽", scenic: "★", repair: "R", viewpoint: "◈", hazard: "!", meetup: "M", custom: "•" };
  return map[k] ?? "•";
}

function FallbackRouteMap({
  className,
  path,
  pois,
  communityPois,
  userLocation,
}: {
  className: string;
  path: LatLng[];
  pois: Poi[];
  communityPois: CommunityPoi[];
  userLocation?: LatLng | null;
}) {
  const points = [...path, ...pois, ...communityPois, ...(userLocation ? [userLocation] : [])];
  const fallbackPath = path.length > 1 ? path : [
    { lat: 25.166, lng: 55.208 },
    { lat: 25.189, lng: 55.253 },
    { lat: 25.214, lng: 55.291 },
    { lat: 25.236, lng: 55.335 },
  ];
  const bounds = points.length ? points : fallbackPath;
  const minLat = Math.min(...bounds.map((p) => p.lat));
  const maxLat = Math.max(...bounds.map((p) => p.lat));
  const minLng = Math.min(...bounds.map((p) => p.lng));
  const maxLng = Math.max(...bounds.map((p) => p.lng));
  const project = (p: LatLng) => {
    const lngSpan = Math.max(maxLng - minLng, 0.02);
    const latSpan = Math.max(maxLat - minLat, 0.02);
    return {
      x: 10 + ((p.lng - minLng) / lngSpan) * 80,
      y: 88 - ((p.lat - minLat) / latSpan) * 76,
    };
  };
  const routeD = fallbackPath.map((p, i) => {
    const pt = project(p);
    return `${i === 0 ? "M" : "L"}${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
  }).join(" ");

  return (
    <div
      className={className + " relative overflow-hidden"}
      style={{
        background:
          "radial-gradient(circle at 50% 36%, rgba(0,200,83,0.16), transparent 35%), linear-gradient(135deg, rgba(0,200,83,0.14) 1px, transparent 1px), linear-gradient(45deg, rgba(255,255,255,0.08) 1px, transparent 1px), #f7f8f6",
        backgroundSize: "100% 100%, 58px 58px, 58px 58px",
      }}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <path d="M0 28 C20 22 32 34 50 28 S78 16 100 24" fill="none" stroke="rgba(8,13,10,0.09)" strokeWidth="5" />
        <path d="M0 66 C18 58 34 72 52 62 S80 50 100 58" fill="none" stroke="rgba(8,13,10,0.08)" strokeWidth="4" />
        <path d="M18 0 C24 26 17 45 29 100" fill="none" stroke="rgba(8,13,10,0.06)" strokeWidth="3" />
        <path d={routeD} fill="none" stroke="rgba(0,200,83,0.98)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {pois.map((p, i) => {
          const pt = project(p);
          return <circle key={`poi-${i}`} cx={pt.x} cy={pt.y} r="1.5" fill="#0b0d10" stroke="#00c853" strokeWidth="0.7" vectorEffect="non-scaling-stroke" />;
        })}
        {communityPois.map((p, i) => {
          const pt = project(p);
          return <circle key={`community-${i}`} cx={pt.x} cy={pt.y} r="1.35" fill="#2563eb" stroke="#fff" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />;
        })}
        {userLocation && (() => {
          const pt = project(userLocation);
          return <path d={`M${pt.x} ${pt.y - 2.4} L${pt.x + 1.9} ${pt.y + 2.1} L${pt.x} ${pt.y + 0.9} L${pt.x - 1.9} ${pt.y + 2.1} Z`} fill="#00c853" stroke="#0b0d10" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />;
        })()}
      </svg>
      <div className="absolute bottom-28 left-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-black shadow-sm md:bottom-4">
        Atlas offline render
      </div>
    </div>
  );
}

const LiveMapShell = ({
  containerRef,
  className,
  path,
  pois,
  communityPois,
  userLocation,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  className: string;
  path: LatLng[];
  pois: Poi[];
  communityPois: CommunityPoi[];
  userLocation?: LatLng | null;
}) => (
  <div ref={containerRef} className={className + " relative overflow-hidden"}>
    <div className="absolute inset-0">
      <FallbackRouteMap className="h-full w-full" path={path} pois={pois} communityPois={communityPois} userLocation={userLocation} />
    </div>
  </div>
);

export default RouteMap;
