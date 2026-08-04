/**
 * Fuel Finder — nearby gas stations with distance, rating, and open-now filter.
 * Also holds the rider's tank/economy prefs used by the low-fuel alert in Ride Mode.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { findFuelNearby, type FuelStation } from "@/lib/fuel.functions";
import { getFuelPrefs, setFuelPrefs, remainingKm, type FuelPrefs } from "@/lib/fuel-prefs";
import { Fuel, MapPin, Star, Navigation2, ArrowLeft, AlertTriangle, Locate } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/atlas/fuel")({
  head: () => ({
    meta: [
      { title: "Fuel Finder · ZOMBIEREX" },
      {
        name: "description",
        content: "Find nearby fuel stations, set your tank range, and get low-fuel alerts.",
      },
    ],
  }),
  component: FuelPage,
});

function FuelPage() {
  const findFn = useServerFn(findFuelNearby);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const [openNow, setOpenNow] = useState(true);
  const [prefs, setPrefsState] = useState<FuelPrefs>(() => getFuelPrefs());
  const [stations, setStations] = useState<FuelStation[]>([]);
  const [tab, setTab] = useState<"nearby" | "range">("nearby");

  const km = remainingKm(prefs);
  const low = km <= prefs.warnKm;

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoErr("Location not available.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setGeoErr("Location permission denied."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 },
    );
  }, []);

  const search = useMutation({
    mutationFn: async () => {
      if (!pos) throw new Error("Waiting for GPS…");
      return findFn({
        data: {
          lat: pos.lat,
          lng: pos.lng,
          radius_m: radiusKm * 1000,
          brand: prefs.preferredBrand || null,
          open_now: openNow,
        },
      });
    },
    onSuccess: (r) => {
      if (r.error) toast.error(r.error);
      setStations(r.stations);
      if (!r.error && r.stations.length === 0) toast("No stations within range.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Search failed"),
  });

  useEffect(() => {
    if (pos) search.mutate(); /* auto-search once GPS is ready */ // eslint-disable-next-line
  }, [pos]);

  function updatePrefs(patch: Partial<FuelPrefs>) {
    const next = setFuelPrefs(patch) as FuelPrefs;
    setPrefsState(next);
  }

  return (
    <div className="min-h-svh pb-24" style={{ background: "var(--color-canvas)" }}>
      <header
        className="sticky top-0 z-10 flex items-center gap-2 border-b px-4 py-3"
        style={{ background: "var(--color-canvas)", borderColor: "var(--color-line)" }}
      >
        <Link to="/atlas" aria-label="Back" className="tap p-1">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-semibold tracking-tight">Fuel Finder</h1>
          <p className="text-[11px]" style={{ color: "var(--color-ink-3)" }}>
            {pos ? `~${radiusKm} km around you` : (geoErr ?? "Locating…")}
          </p>
        </div>
        <Fuel className="h-5 w-5" style={{ color: low ? "#dc2626" : "var(--color-ink-2)" }} />
      </header>

      {/* Range status card */}
      <section className="px-4 pt-4">
        <div
          className="rounded-2xl border p-4"
          style={{
            borderColor: low ? "#ffb3b3" : "var(--color-line)",
            background: low ? "#fff1f1" : "transparent",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div
                className="text-[10px] uppercase tracking-wider"
                style={{ color: "var(--color-ink-3)" }}
              >
                Estimated range
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span
                  className="text-4xl font-bold tabular-nums"
                  style={{ color: low ? "#dc2626" : "var(--color-ink-1)" }}
                >
                  {km}
                </span>
                <span className="text-sm" style={{ color: "var(--color-ink-3)" }}>
                  km left
                </span>
              </div>
              <div className="text-[11px] mt-1" style={{ color: "var(--color-ink-3)" }}>
                Tank {prefs.currentPct}% ·{" "}
                {((prefs.tankCapacityL * prefs.currentPct) / 100).toFixed(1)} L
              </div>
            </div>
            {low && (
              <div className="flex items-center gap-1 text-xs font-semibold text-red-700">
                <AlertTriangle className="h-4 w-4" /> LOW FUEL
              </div>
            )}
          </div>
          <FuelGauge pct={prefs.currentPct} onChange={(v) => updatePrefs({ currentPct: v })} />
        </div>
      </section>

      {/* Tabs */}
      <div className="mt-4 flex border-b px-4" style={{ borderColor: "var(--color-line)" }}>
        {(["nearby", "range"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="tap flex-1 py-2 text-xs font-semibold uppercase tracking-wider transition-colors"
            style={{
              color: tab === t ? "var(--color-ink-1)" : "var(--color-ink-3)",
              borderBottom: `2px solid ${tab === t ? "var(--color-neon, #00c853)" : "transparent"}`,
            }}
          >
            {t === "nearby" ? "Nearby stations" : "Bike & range"}
          </button>
        ))}
      </div>

      {tab === "nearby" ? (
        <section className="px-4 pt-3">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <label className="flex items-center gap-2">
              Radius
              <select
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="rounded border px-2 py-1"
                style={{ borderColor: "var(--color-line)" }}
              >
                {[3, 5, 10, 20, 40].map((n) => (
                  <option key={n} value={n}>
                    {n} km
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={openNow}
                onChange={(e) => setOpenNow(e.target.checked)}
              />{" "}
              Open now
            </label>
            <button
              onClick={() => search.mutate()}
              disabled={!pos || search.isPending}
              className="tap ml-auto rounded-lg px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: "#111" }}
            >
              <Locate className="inline h-3.5 w-3.5 mr-1" />
              {search.isPending ? "Searching…" : "Refresh"}
            </button>
          </div>

          {search.isPending && stations.length === 0 ? (
            <ul className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <li
                  key={i}
                  className="h-16 rounded-lg animate-pulse"
                  style={{ background: "var(--color-line)" }}
                />
              ))}
            </ul>
          ) : stations.length === 0 ? (
            <div
              className="rounded-lg border p-6 text-center text-sm"
              style={{ borderColor: "var(--color-line)", color: "var(--color-ink-3)" }}
            >
              No stations found. Try a wider radius.
            </div>
          ) : (
            <ul className="space-y-2">
              {stations.map((s) => (
                <li
                  key={s.google_place_id}
                  className="rounded-lg border p-3"
                  style={{ borderColor: "var(--color-line)" }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-lg"
                      style={{ background: "#111", color: "#00c853" }}
                    >
                      <Fuel className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">{s.name}</p>
                        {s.open_now === true && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                            OPEN
                          </span>
                        )}
                        {s.open_now === false && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                            CLOSED
                          </span>
                        )}
                      </div>
                      {s.address && (
                        <p className="truncate text-[11px]" style={{ color: "var(--color-ink-3)" }}>
                          {s.address}
                        </p>
                      )}
                      <div
                        className="mt-1 flex items-center gap-3 text-[11px]"
                        style={{ color: "var(--color-ink-3)" }}
                      >
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {fmtDist(s.distance_m)}
                        </span>
                        {s.rating != null && (
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {s.rating.toFixed(1)}
                          </span>
                        )}
                        {km > 0 && s.distance_m / 1000 > km && (
                          <span className="text-red-600 font-semibold">Out of range</span>
                        )}
                      </div>
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=driving`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tap grid h-10 w-10 shrink-0 place-items-center rounded-lg text-white"
                      style={{ background: "#00c853" }}
                      aria-label="Navigate"
                    >
                      <Navigation2 className="h-5 w-5" />
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section className="px-4 pt-3 space-y-3">
          <Field label="Tank capacity (L)">
            <input
              type="number"
              min={1}
              max={80}
              step={0.5}
              value={prefs.tankCapacityL}
              onChange={(e) => updatePrefs({ tankCapacityL: Number(e.target.value) || 0 })}
              className="w-full rounded border px-3 py-2 text-sm"
              style={{ borderColor: "var(--color-line)" }}
            />
          </Field>
          <Field label="Fuel economy (km per L)">
            <input
              type="number"
              min={1}
              max={80}
              step={0.5}
              value={prefs.economyKmPerL}
              onChange={(e) => updatePrefs({ economyKmPerL: Number(e.target.value) || 0 })}
              className="w-full rounded border px-3 py-2 text-sm"
              style={{ borderColor: "var(--color-line)" }}
            />
          </Field>
          <Field label="Alert me when remaining range is below (km)">
            <input
              type="number"
              min={5}
              max={200}
              step={5}
              value={prefs.warnKm}
              onChange={(e) => updatePrefs({ warnKm: Number(e.target.value) || 0 })}
              className="w-full rounded border px-3 py-2 text-sm"
              style={{ borderColor: "var(--color-line)" }}
            />
          </Field>
          <Field label="Preferred brand (optional)">
            <input
              value={prefs.preferredBrand}
              onChange={(e) => updatePrefs({ preferredBrand: e.target.value })}
              placeholder="Shell, BP, Total…"
              className="w-full rounded border px-3 py-2 text-sm"
              style={{ borderColor: "var(--color-line)" }}
            />
          </Field>
          <p className="text-[11px]" style={{ color: "var(--color-ink-3)" }}>
            Range = tank × current % × km/L. Adjust the current % on the gauge above after fueling.
          </p>
        </section>
      )}
    </div>
  );
}

function FuelGauge({ pct, onChange }: { pct: number; onChange: (v: number) => void }) {
  return (
    <div className="mt-3">
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={pct}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-black"
      />
      <div
        className="mt-1 flex justify-between text-[10px]"
        style={{ color: "var(--color-ink-3)" }}
      >
        <span>E</span>
        <span>¼</span>
        <span>½</span>
        <span>¾</span>
        <span>F</span>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span
        className="mb-1 block text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: "var(--color-ink-3)" }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function fmtDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}
