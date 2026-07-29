/**
 * Turn-by-turn navigation — Google Directions via connector gateway.
 * Returns a normalized route with polyline + step-by-step guidance.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const NavInput = z.object({
  origin: z.object({ lat: z.number(), lng: z.number() }),
  destination: z.object({ lat: z.number(), lng: z.number() }),
  avoid_highways: z.boolean().default(false),
  avoid_tolls: z.boolean().default(false),
  avoid_unpaved: z.boolean().default(false),
});

export const planRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => NavInput.parse(d))
  .handler(async ({ data, context }) => {
    // Maps calls are metered and billable — signed-in + rate limited only.
    await context.supabase.rpc("check_rate_limit", {
      _bucket: "maps_directions",
      _max_hits: 60,
      _window_seconds: 3600,
    });
    const LOVABLE_KEY = process.env.LOVABLE_API_KEY;
    const GMAPS_KEY = process.env.GOOGLE_MAPS_API_KEY;
    if (!LOVABLE_KEY || !GMAPS_KEY) {
      return { error: "Navigation service unavailable", steps: [], polyline: "", distance_m: 0, duration_s: 0 };
    }
    const avoid: string[] = [];
    if (data.avoid_highways) avoid.push("HIGHWAYS");
    if (data.avoid_tolls) avoid.push("TOLLS");
    if (data.avoid_unpaved) avoid.push("INDOOR"); // no true unpaved flag; kept for parity
    const body = {
      origin: { location: { latLng: data.origin } },
      destination: { location: { latLng: data.destination } },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      routeModifiers: {
        avoidHighways: data.avoid_highways,
        avoidTolls: data.avoid_tolls,
      },
      languageCode: "en",
      units: "METRIC",
      computeAlternativeRoutes: false,
    };
    try {
      const res = await fetch("https://connector-gateway.lovable.dev/google_maps/routes/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_KEY}`,
          "X-Connection-Api-Key": GMAPS_KEY,
          "Content-Type": "application/json",
          "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters,routes.legs.steps.startLocation,routes.legs.steps.endLocation",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const txt = await res.text();
        console.error("[planRoute] gateway", res.status, txt);
        return { error: `Directions failed (${res.status})`, steps: [], polyline: "", distance_m: 0, duration_s: 0 };
      }
      const json: any = await res.json();
      const r = json.routes?.[0];
      if (!r) return { error: "No route found", steps: [], polyline: "", distance_m: 0, duration_s: 0 };
      const steps = (r.legs?.[0]?.steps ?? []).map((s: any) => ({
        instruction: s.navigationInstruction?.instructions ?? "",
        maneuver: s.navigationInstruction?.maneuver ?? "",
        distance_m: s.distanceMeters ?? 0,
        start: s.startLocation?.latLng ?? null,
        end: s.endLocation?.latLng ?? null,
      }));
      return {
        error: null as string | null,
        polyline: r.polyline?.encodedPolyline ?? "",
        distance_m: r.distanceMeters ?? 0,
        duration_s: parseInt(String(r.duration ?? "0").replace("s", ""), 10) || 0,
        steps,
      };
    } catch (e: any) {
      console.error("[planRoute] err", e);
      return { error: e.message ?? "Navigation error", steps: [], polyline: "", distance_m: 0, duration_s: 0 };
    }
  });
