/**
 * Fuel station search — nearby gas stations with distance sort.
 * Used by /atlas/fuel and the low-fuel alert in Ride Mode.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radius_m: z.number().min(500).max(50000).default(10000),
  brand: z.string().max(40).optional().nullable(),
  open_now: z.boolean().default(false),
});

export type FuelStation = {
  google_place_id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  rating: number | null;
  open_now: boolean | null;
  distance_m: number;
};

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export const findFuelNearby = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => Input.parse(d))
  .handler(async ({ data, context }): Promise<{ stations: FuelStation[]; error: string | null }> => {
    // Maps calls are metered and billable — signed-in + rate limited only.
    await context.supabase.rpc("check_rate_limit", {
      _bucket: "maps_places",
      _max_hits: 90,
      _window_seconds: 3600,
    });
    const LOVABLE = process.env.LOVABLE_API_KEY;
    const GKEY = process.env.GOOGLE_MAPS_API_KEY;
    if (!LOVABLE || !GKEY) return { stations: [], error: "Maps not configured" };

    const q = data.brand?.trim() ? `${data.brand.trim()} gas station` : "gas station fuel petrol";
    try {
      const resp = await fetch(
        "https://connector-gateway.lovable.dev/google_maps/places/v1/places:searchText",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE}`,
            "X-Connection-Api-Key": GKEY,
            "Content-Type": "application/json",
            "X-Goog-FieldMask":
              "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.regularOpeningHours.openNow,places.currentOpeningHours.openNow",
          },
          body: JSON.stringify({
            textQuery: q,
            maxResultCount: 20,
            locationBias: {
              circle: {
                center: { latitude: data.lat, longitude: data.lng },
                radius: data.radius_m,
              },
            },
          }),
        },
      );
      if (!resp.ok) {
        const txt = await resp.text();
        console.error("[findFuelNearby] gateway", resp.status, txt);
        return { stations: [], error: `Fuel search failed (${resp.status})` };
      }
      const json = (await resp.json()) as any;
      const origin = { lat: data.lat, lng: data.lng };
      const stations: FuelStation[] = [];
      for (const p of json.places ?? []) {
        const loc = p.location;
        if (!loc || typeof loc.latitude !== "number") continue;
        const openNow =
          p.currentOpeningHours?.openNow ?? p.regularOpeningHours?.openNow ?? null;
        if (data.open_now && openNow === false) continue;
        stations.push({
          google_place_id: p.id ?? crypto.randomUUID(),
          name: p.displayName?.text ?? "Fuel station",
          address: p.formattedAddress ?? null,
          lat: loc.latitude,
          lng: loc.longitude,
          rating: typeof p.rating === "number" ? p.rating : null,
          open_now: openNow,
          distance_m: Math.round(haversine(origin, { lat: loc.latitude, lng: loc.longitude })),
        });
      }
      stations.sort((a, b) => a.distance_m - b.distance_m);
      return { stations: stations.slice(0, 30), error: null };
    } catch (e: any) {
      console.error("[findFuelNearby] err", e);
      return { stations: [], error: e?.message ?? "Fuel search error" };
    }
  });
