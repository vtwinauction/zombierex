/**
 * Public (unauthenticated) reads for a rider's Digital Garage.
 * Safe for SSR on public profile routes — anon-readable columns only.
 * Service records are never exposed here; they are owner-private.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const listPublicGarage = createServerFn({ method: "GET" })
  .validator((raw: unknown) => z.object({ ownerId: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
            h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const { data: vehicles, error } = await client
      .from("vehicles")
      .select("id, kind, make, model, year, nickname, hero_image_url, is_primary")
      .eq("owner_id", data.ownerId)
      .is("deleted_at", null)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(12);
    if (error) throw new Error(error.message);
    if (!vehicles?.length) return [];

    const ids = vehicles.map((v) => v.id);
    // Published-event judge scores only (RLS restricts to public published events).
    const { data: judged } = await client
      .from("judge_entries")
      .select("vehicle_id, overall_score")
      .in("vehicle_id", ids)
      .not("overall_score", "is", null)
      .limit(200);
    const bestScore = new Map<string, number>();
    for (const j of judged ?? []) {
      if (!j.vehicle_id) continue;
      const score = Number(j.overall_score);
      if (!Number.isFinite(score)) continue;
      if (score > (bestScore.get(j.vehicle_id) ?? -1)) bestScore.set(j.vehicle_id, score);
    }

    const { data: mods } = await client
      .from("vehicle_mods")
      .select("id, vehicle_id, category, title, brand")
      .in("vehicle_id", ids)
      .order("created_at", { ascending: false })
      .limit(200);

    return vehicles.map((v) => ({
      ...v,
      mods: (mods ?? []).filter((m) => m.vehicle_id === v.id),
      judge_score: bestScore.get(v.id) ?? null,
    }));
  });

/** Posts tagged with a vehicle — public feed slice for the vehicle page. */
export const listVehiclePosts = createServerFn({ method: "GET" })
  .validator((raw: unknown) => z.object({ vehicleId: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
            h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const { data: posts, error } = await client
      .from("posts")
      .select("id, kind, caption, media_url, thumbnail_url, is_reel, created_at")
      .eq("vehicle_id", data.vehicleId)
      .order("created_at", { ascending: false })
      .limit(24);
    if (error) throw new Error(error.message);
    return posts ?? [];
  });

/** Garage provenance for a marketplace listing linked to a vehicle. */
export const getListingProvenance = createServerFn({ method: "GET" })
  .validator((raw: unknown) => z.object({ listingId: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
            h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const { data: listing } = await client
      .from("listings")
      .select("id, vehicle_id")
      .eq("id", data.listingId)
      .maybeSingle();
    if (!listing?.vehicle_id) return null;

    const { data: vehicle } = await client
      .from("vehicles")
      .select("id, owner_id, kind, make, model, year, nickname, odometer_km, created_at")
      .eq("id", listing.vehicle_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!vehicle) return null;

    const { data: mods } = await client
      .from("vehicle_mods")
      .select("id, category, title, brand")
      .eq("vehicle_id", vehicle.id)
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: judged } = await client
      .from("judge_entries")
      .select("overall_score")
      .eq("vehicle_id", vehicle.id)
      .not("overall_score", "is", null)
      .order("overall_score", { ascending: false })
      .limit(1);
    const judgeScore = judged?.[0]?.overall_score != null ? Number(judged[0].overall_score) : null;

    return { vehicle, mods: mods ?? [], judge_score: judgeScore };
  });

/** Full public spec sheet for one vehicle — powers the shareable /v/$id page. */
export const getPublicVehicle = createServerFn({ method: "GET" })
  .validator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
            h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const { data: vehicle } = await client
      .from("vehicles")
      .select(
        "id, owner_id, kind, make, model, year, nickname, hero_image_url, odometer_km, spec, created_at",
      )
      .eq("id", data.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!vehicle) return null;

    const [{ data: owner }, { data: mods }, { data: judged }] = await Promise.all([
      client
        .from("profiles")
        .select("id, handle, display_name, avatar_url")
        .eq("id", vehicle.owner_id)
        .maybeSingle(),
      client
        .from("vehicle_mods")
        .select("id, category, title, brand, installed_on")
        .eq("vehicle_id", vehicle.id)
        .order("created_at", { ascending: false })
        .limit(60),
      client
        .from("judge_entries")
        .select("overall_score")
        .eq("vehicle_id", vehicle.id)
        .not("overall_score", "is", null)
        .order("overall_score", { ascending: false })
        .limit(1),
    ]);

    return {
      vehicle,
      owner: owner ?? null,
      mods: mods ?? [],
      judge_score: judged?.[0]?.overall_score != null ? Number(judged[0].overall_score) : null,
    };
  });
