import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { searchGarages } from "@/lib/garages.functions";
import {
  GARAGE_SPECIALTIES,
  GARAGE_VEHICLE_TYPES,
  SPECIALTY_LABEL,
  estimateDriveMinutes,
  formatDistance,
  isOpenNow,
} from "@/lib/garage-taxonomy";
import { PullToRefresh } from "@/components/PullToRefresh";

const RouteMap = lazy(() => import("@/components/RouteMap").then((m) => ({ default: m.RouteMap })));

export const Route = createFileRoute("/garages")({
  head: () => ({
    meta: [
      { title: "Find a Garage · ZOMBIEREX" },
      {
        name: "description",
        content:
          "Discover the nearest motorcycle and car workshops — distance, ratings, services, opening hours and instant service booking.",
      },
      { property: "og:title", content: "Find a Garage · ZOMBIEREX" },
      {
        property: "og:description",
        content:
          "Nearby workshops with ratings, specialties, live opening status and one-tap service booking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GarageDiscovery,
});

type Coords = { lat: number; lng: number } | null;

function GarageDiscovery() {
  const [coords, setCoords] = useState<Coords>(null);
  const [geoState, setGeoState] = useState<"idle" | "asking" | "denied" | "ok">("idle");
  const [view, setView] = useState<"list" | "map">("list");
  const [q, setQ] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [vehicleType, setVehicleType] = useState<string | undefined>();
  const [emergency, setEmergency] = useState(false);
  const [active, setActive] = useState<any | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setGeoState("asking");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
        setGeoState("ok");
      },
      () => setGeoState("denied"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }, []);

  const search = useServerFn(searchGarages);
  const { data, isLoading, refetch, isError } = useQuery({
    queryKey: ["garages", coords, q, specialties, vehicleType, emergency],
    queryFn: () =>
      search({
        data: {
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          q: q || undefined,
          specialties: specialties.length ? specialties : undefined,
          vehicle_type: vehicleType,
          emergency: emergency ? true : undefined,
          limit: 60,
        },
      }),
  });

  const results = (data ?? []) as any[];
  const mapPois = useMemo(
    () =>
      results
        .filter((g) => g.lat != null && g.lng != null)
        .map((g) => ({ id: g.id, lat: g.lat, lng: g.lng, name: g.business_name, kind: "repair" })),
    [results],
  );

  const toggleSpec = (code: string) =>
    setSpecialties((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));

  return (
    <PullToRefresh onRefresh={() => refetch()}>
      <div className="pb-28">
        <header className="px-4 pt-6">
          <p className="mono-tag" style={{ color: "var(--color-titanium)" }}>
            {isLoading ? "SCANNING…" : `${results.length} WORKSHOPS`}
          </p>
          <h1 className="serif mt-2 text-4xl italic">Find a Garage</h1>
          <p className="mt-1 text-sm opacity-70">
            {geoState === "ok"
              ? "Sorted by distance from you."
              : geoState === "denied"
                ? "Location off — search by city or name to sort manually."
                : "Detecting your location…"}
          </p>
        </header>

        <div className="px-4 pt-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search garage, service, brand or city…"
            className="w-full border px-3 py-3 text-sm"
            style={{ borderColor: "var(--color-line)", background: "rgba(255,255,255,0.02)" }}
          />
        </div>

        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
          <Chip on={emergency} onClick={() => setEmergency((v) => !v)} label="Emergency / roadside" />
          {GARAGE_VEHICLE_TYPES.map((v) => (
            <Chip
              key={v.code}
              on={vehicleType === v.code}
              onClick={() => setVehicleType(vehicleType === v.code ? undefined : v.code)}
              label={v.label}
            />
          ))}
          {GARAGE_SPECIALTIES.map((s) => (
            <Chip
              key={s.code}
              on={specialties.includes(s.code)}
              onClick={() => toggleSpec(s.code)}
              label={s.label}
            />
          ))}
        </div>

        <div className="mt-4 flex gap-2 px-4">
          {(["list", "map"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="tap flex-1 border py-2 text-xs uppercase tracking-widest"
              style={{
                borderColor: view === v ? "var(--color-signal, #00c853)" : "var(--color-line)",
                background: view === v ? "rgba(0,200,83,0.06)" : "transparent",
              }}
            >
              {v} view
            </button>
          ))}
        </div>

        {isError && (
          <p className="px-4 pt-6 text-sm" style={{ color: "#c0392b" }}>
            Couldn’t load garages. Pull to refresh.
          </p>
        )}

        {view === "map" ? (
          <div className="mt-4">
            <ClientOnly fallback={<div className="mx-4 h-80 animate-pulse" style={{ background: "var(--color-line)" }} />}>
              <Suspense fallback={<div className="mx-4 h-80" style={{ background: "var(--color-line)" }} />}>
                <RouteMap
                  className="h-80 w-full"
                  theme="light"
                  zoom={coords ? 11 : 8}
                  center={coords ?? undefined}
                  userLocation={coords}
                  communityPois={mapPois}
                  onCommunityPoiClick={(p: any) => setActive(results.find((g) => g.id === p.id) ?? null)}
                />
              </Suspense>
            </ClientOnly>
            {active && (
              <div className="px-4 pt-4">
                <GarageCard g={active} />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 px-4 pt-4">
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse" style={{ background: "var(--color-line)" }} />
              ))}
            {!isLoading && results.length === 0 && (
              <div className="border px-4 py-10 text-center" style={{ borderColor: "var(--color-line)" }}>
                <p className="serif text-xl italic">No workshops match</p>
                <p className="mt-1 text-sm opacity-70">
                  Try clearing filters, or widen your search to another city.
                </p>
              </div>
            )}
            {results.map((g) => (
              <GarageCard key={g.id} g={g} />
            ))}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}

function Chip({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="tap shrink-0 border px-3 py-1.5 text-xs"
      style={{
        borderColor: on ? "var(--color-signal, #00c853)" : "var(--color-line)",
        background: on ? "rgba(0,200,83,0.08)" : "transparent",
      }}
    >
      {label}
    </button>
  );
}

function GarageCard({ g }: { g: any }) {
  const open = isOpenNow(g.availability ?? null);
  const mins = estimateDriveMinutes(g.distance_km);
  return (
    <Link
      to="/w/$slug"
      params={{ slug: g.slug }}
      className="tap block border"
      style={{ borderColor: "var(--color-line)" }}
    >
      <div className="flex gap-3 p-3">
        <div
          className="h-20 w-20 shrink-0 bg-cover bg-center"
          style={{
            backgroundImage: g.logo_url ? `url(${g.logo_url})` : g.cover_url ? `url(${g.cover_url})` : undefined,
            background: g.logo_url || g.cover_url ? undefined : "var(--color-line)",
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{g.business_name}</h3>
            {g.is_verified && (
              <span className="mono-tag text-[9px]" style={{ color: "var(--color-signal, #00c853)" }}>
                VERIFIED
              </span>
            )}
          </div>
          <p className="mono-tag mt-0.5 text-[10px] opacity-60">
            {formatDistance(g.distance_km)}
            {mins ? ` · ~${mins} min` : ""} · {g.city ?? "—"}
          </p>
          <p className="mt-1 truncate text-xs opacity-70">
            {(g.specialties ?? []).slice(0, 3).map((s: string) => SPECIALTY_LABEL[s] ?? s).join(" · ") ||
              g.business_type?.replace(/_/g, " ")}
          </p>
          <div className="mt-1 flex items-center gap-3 text-[11px]">
            <span className="mono-num">★ {Number(g.rating_avg ?? 0).toFixed(1)}</span>
            <span className="opacity-60">{g.reviews_count ?? 0} reviews</span>
            <span style={{ color: open ? "var(--color-signal, #00c853)" : "#b0483c" }}>
              {open ? "Open now" : "Closed"}
            </span>
            {g.emergency_service && <span className="opacity-70">24/7 roadside</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}
