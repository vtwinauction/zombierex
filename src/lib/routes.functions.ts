/**
 * Route Atlas — plan, record, share motorcycle routes with POIs.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(process.env.SUPABASE_URL!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const POI_KINDS = ["hotel","food","fuel","scenic","repair","viewpoint","custom"] as const;
export const DIFFICULTIES = ["easy","moderate","hard","expert"] as const;
export const SURFACES = ["paved","mixed","offroad"] as const;

const LatLng = z.object({ lat: z.number(), lng: z.number() });
const PoiInput = z.object({
  name: z.string().trim().min(1).max(120),
  kind: z.enum(POI_KINDS).default("custom"),
  google_place_id: z.string().max(200).optional().nullable(),
  lat: z.number(),
  lng: z.number(),
  address: z.string().max(400).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  order_index: z.number().int().min(0).default(0),
});

const RouteInput = z.object({
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().max(4000).optional().nullable(),
  visibility: z.enum(["public","private"]).default("public"),
  difficulty: z.enum(DIFFICULTIES).default("moderate"),
  surface: z.enum(SURFACES).default("paved"),
  region: z.string().max(120).optional().nullable(),
  cover_url: z.string().url().max(1000).optional().nullable(),
  path: z.array(LatLng).min(2).max(2000),
  distance_m: z.number().int().min(0).default(0),
  duration_s: z.number().int().min(0).default(0),
  source: z.enum(["planned","recorded"]).default("planned"),
  pois: z.array(PoiInput).max(60).default([]),
});

/* ------------------------------ Reads ------------------------------ */

export const listPublicRoutes = createServerFn({ method: "GET" })
  .validator((d: { limit?: number; region?: string | null; difficulty?: string | null; surface?: string | null } = {}) => d)
  .handler(async ({ data }) => {
    const s = publicClient();
    let q = s.from("routes" as any)
      .select("id,title,description,visibility,distance_m,duration_s,difficulty,surface,region,cover_url,path,start_lat,start_lng,saves_count,rides_count,likes_count,owner_id,created_at")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(data.limit ?? 30, 1), 60));
    if (data.region) q = q.ilike("region", `%${data.region}%`);
    if (data.difficulty) q = q.eq("difficulty", data.difficulty);
    if (data.surface) q = q.eq("surface", data.surface);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getRoute = createServerFn({ method: "GET" })
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const s = publicClient();
    const { data: route, error } = await s.from("routes" as any).select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!route) return null;
    const { data: pois } = await s.from("route_pois" as any).select("*").eq("route_id", data.id).order("order_index");
    const { data: owner } = await s.from("profiles").select("id,display_name,avatar_url").eq("id", (route as any).owner_id).maybeSingle();
    return { ...(route as any), pois: pois ?? [], owner };
  });

export const listMyRoutes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("routes" as any)
      .select("id,title,visibility,distance_m,duration_s,difficulty,surface,region,cover_url,saves_count,rides_count,created_at")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listSavedRoutes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("route_saves" as any)
      .select("route_id, routes:route_id(id,title,visibility,distance_m,duration_s,difficulty,surface,region,cover_url,saves_count,rides_count,owner_id,created_at)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => r.routes).filter(Boolean);
  });

/* ------------------------------ Writes ------------------------------ */

export const createRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: z.input<typeof RouteInput>) => RouteInput.parse(d))
  .handler(async ({ data, context }) => {
    const first = data.path[0];
    const last = data.path[data.path.length - 1];
    const { data: inserted, error } = await context.supabase
      .from("routes" as any)
      .insert({
        owner_id: context.userId,
        title: data.title,
        description: data.description,
        visibility: data.visibility,
        difficulty: data.difficulty,
        surface: data.surface,
        region: data.region,
        cover_url: data.cover_url,
        path: data.path,
        distance_m: data.distance_m,
        duration_s: data.duration_s,
        source: data.source,
        start_lat: first.lat, start_lng: first.lng,
        end_lat: last.lat, end_lng: last.lng,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const routeId = (inserted as any).id as string;
    if (data.pois.length) {
      const rows = data.pois.map((p, i) => ({ ...p, route_id: routeId, order_index: p.order_index ?? i }));
      const { error: perr } = await context.supabase.from("route_pois" as any).insert(rows);
      if (perr) throw new Error(perr.message);
    }
    return { id: routeId };
  });

export const deleteRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("routes" as any).delete().eq("id", data.id).eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleSaveRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase.from("route_saves" as any)
      .select("route_id").eq("user_id", context.userId).eq("route_id", data.id).maybeSingle();
    if (existing) {
      await context.supabase.from("route_saves" as any).delete().eq("user_id", context.userId).eq("route_id", data.id);
      return { saved: false };
    }
    await context.supabase.from("route_saves" as any).insert({ user_id: context.userId, route_id: data.id });
    return { saved: true };
  });

export const startRide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("route_rides" as any).insert({ user_id: context.userId, route_id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------ Places search via gateway ------------------------------ */

export const searchPlacesNearby = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { lat: number; lng: number; kind: string; query?: string; radius?: number }) =>
    z.object({
      lat: z.number(), lng: z.number(),
      kind: z.enum(POI_KINDS),
      query: z.string().max(120).optional(),
      radius: z.number().min(500).max(50000).default(15000),
    }).parse(d))
  .handler(async ({ data }) => {
    const LOVABLE = process.env.LOVABLE_API_KEY;
    const GKEY = process.env.GOOGLE_MAPS_API_KEY;
    if (!LOVABLE || !GKEY) throw new Error("Maps not configured");
    const kindQuery: Record<string, string> = {
      hotel: "hotel motel lodging", food: "restaurant cafe diner", fuel: "gas station fuel",
      scenic: "scenic viewpoint", repair: "motorcycle repair mechanic",
      viewpoint: "viewpoint scenic overlook", custom: "point of interest",
    };
    const textQuery = (data.query?.trim() || kindQuery[data.kind]);
    const resp = await fetch("https://connector-gateway.lovable.dev/google_maps/places/v1/places:searchText", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE}`,
        "X-Connection-Api-Key": GKEY,
        "Content-Type": "application/json",
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating",
      },
      body: JSON.stringify({
        textQuery,
        maxResultCount: 12,
        locationBias: { circle: { center: { latitude: data.lat, longitude: data.lng }, radius: data.radius } },
      }),
    });
    if (!resp.ok) {
      const body = await resp.text();
      console.error("places search failed", resp.status, body);
      throw new Error(`Places search failed: ${resp.status}`);
    }
    const json = await resp.json() as any;
    return (json.places ?? []).map((p: any) => ({
      google_place_id: p.id,
      name: p.displayName?.text ?? "Unnamed",
      address: p.formattedAddress ?? null,
      lat: p.location?.latitude, lng: p.location?.longitude,
      rating: p.rating ?? null,
    })).filter((p: any) => typeof p.lat === "number");
  });

/* ------------------------------ Community POIs ------------------------------ */

export const COMMUNITY_POI_KINDS = ["hotel","food","fuel","scenic","repair","viewpoint","hazard","meetup","custom"] as const;

const BBox = z.object({
  minLat: z.number(), maxLat: z.number(),
  minLng: z.number(), maxLng: z.number(),
});

export const listCommunityPois = createServerFn({ method: "GET" })
  .validator((d: { minLat?: number; maxLat?: number; minLng?: number; maxLng?: number; kind?: string; limit?: number } = {}) => d)
  .handler(async ({ data }) => {
    const s = publicClient();
    let q = s.from("community_pois" as any)
      .select("id,name,kind,lat,lng,address,note,region,upvotes_count,created_by,created_at")
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(data.limit ?? 200, 1), 500));
    if (data.kind && data.kind !== "all") q = q.eq("kind", data.kind);
    if (typeof data.minLat === "number" && typeof data.maxLat === "number") {
      q = q.gte("lat", data.minLat).lte("lat", data.maxLat);
    }
    if (typeof data.minLng === "number" && typeof data.maxLng === "number") {
      q = q.gte("lng", data.minLng).lte("lng", data.maxLng);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createCommunityPoi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({
    name: z.string().trim().min(1).max(120),
    kind: z.enum(COMMUNITY_POI_KINDS).default("custom"),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().max(400).optional().nullable(),
    note: z.string().max(600).optional().nullable(),
    region: z.string().max(120).optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("community_pois" as any)
      .insert({ ...data, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as any).id as string };
  });

export const deleteCommunityPoi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("community_pois" as any)
      .delete()
      .eq("id", data.id)
      .eq("created_by", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------ Assistant: POIs along a route ------------------------------ */

/**
 * Given a route path, sample midpoints and query Google Places for each kind,
 * returning a de-duplicated ranked list of POIs the rider might want to add.
 */
export const suggestPoisForRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({
    path: z.array(z.object({ lat: z.number(), lng: z.number() })).min(2).max(2000),
    kinds: z.array(z.enum(POI_KINDS)).min(1).max(6).default(["hotel","food","fuel","scenic"] as any),
    samples: z.number().int().min(1).max(6).default(3),
    radius: z.number().min(1000).max(30000).default(8000),
  }).parse(d))
  .handler(async ({ data }) => {
    const LOVABLE = process.env.LOVABLE_API_KEY;
    const GKEY = process.env.GOOGLE_MAPS_API_KEY;
    if (!LOVABLE || !GKEY) throw new Error("Maps not configured");
    const kindQuery: Record<string, string> = {
      hotel: "hotel motel lodging", food: "restaurant cafe diner", fuel: "gas station fuel",
      scenic: "scenic viewpoint", repair: "motorcycle repair mechanic",
      viewpoint: "viewpoint scenic overlook", custom: "point of interest",
    };
    const anchors: Array<{ lat: number; lng: number }> = [];
    const step = Math.max(1, Math.floor(data.path.length / (data.samples + 1)));
    for (let i = 1; i <= data.samples; i++) {
      const p = data.path[Math.min(data.path.length - 1, i * step)];
      if (p) anchors.push(p);
    }

    const out: Array<{ google_place_id: string; name: string; address: string | null; lat: number; lng: number; kind: string; rating: number | null; distance_hint_m: number }> = [];
    const seen = new Set<string>();

    await Promise.all(anchors.flatMap((anchor) =>
      data.kinds.map(async (kind) => {
        const resp = await fetch("https://connector-gateway.lovable.dev/google_maps/places/v1/places:searchText", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE}`,
            "X-Connection-Api-Key": GKEY,
            "Content-Type": "application/json",
            "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating",
          },
          body: JSON.stringify({
            textQuery: kindQuery[kind] ?? kind,
            maxResultCount: 5,
            locationBias: { circle: { center: { latitude: anchor.lat, longitude: anchor.lng }, radius: data.radius } },
          }),
        });
        if (!resp.ok) return;
        const json = await resp.json() as any;
        for (const p of (json.places ?? [])) {
          const id = p.id as string | undefined;
          if (!id || seen.has(id)) continue;
          const loc = p.location;
          if (!loc || typeof loc.latitude !== "number") continue;
          seen.add(id);
          out.push({
            google_place_id: id,
            name: p.displayName?.text ?? "Unnamed",
            address: p.formattedAddress ?? null,
            lat: loc.latitude, lng: loc.longitude,
            kind,
            rating: typeof p.rating === "number" ? p.rating : null,
            distance_hint_m: Math.round(haversineMeters(anchor, { lat: loc.latitude, lng: loc.longitude })),
          });
        }
      })
    ));

    // sort by rating desc, then distance asc
    out.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || a.distance_hint_m - b.distance_hint_m);
    return out.slice(0, 40);
  });

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat/2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng/2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
