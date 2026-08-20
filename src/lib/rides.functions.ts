/**
 * Rides — private ride telemetry (distinct from published public routes).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LatLng = z.object({
  lat: z.number(),
  lng: z.number(),
  t: z.number().optional(),
  spd: z.number().optional(),
  alt: z.number().optional(),
});

const RideInput = z.object({
  title: z.string().trim().max(140).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  path: z.array(LatLng).min(2),
  distance_m: z.number().int().min(0),
  duration_s: z.number().int().min(0),
  moving_s: z.number().int().min(0).default(0),
  avg_speed_kmh: z.number().min(0).max(400).default(0),
  max_speed_kmh: z.number().min(0).max(400).default(0),
  elev_gain_m: z.number().int().min(0).default(0),
  started_at: z.string().datetime().optional(),
  ended_at: z.string().datetime().optional(),
  visibility: z.enum(["private", "unlisted", "public"]).default("private"),
  vehicle_id: z.string().uuid().optional().nullable(),
});

export const createRide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => RideInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { ownedVehicleId } = await import("@/lib/rides.server");
    let vehicleId = await ownedVehicleId(supabase, userId, data.vehicle_id);
    if (!vehicleId) {
      // Default to the rider's primary vehicle so odometers stay accurate.
      const { data: primary } = await supabase
        .from("vehicles")
        .select("id")
        .eq("owner_id", userId)
        .eq("is_primary", true)
        .is("deleted_at", null)
        .maybeSingle();
      vehicleId = primary?.id ?? null;
    }
    const { data: row, error } = await supabase
      .from("rides")
      .insert({ ...data, vehicle_id: vehicleId, user_id: userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const listMyRides = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("rides")
      .select(
        "id,title,distance_m,duration_s,avg_speed_kmh,max_speed_kmh,started_at,visibility,vehicle_id",
      )
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getRide = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("rides")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Ride not found");
    return row;
  });

export const updateRide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().max(140).optional().nullable(),
        notes: z.string().max(4000).optional().nullable(),
        visibility: z.enum(["private", "unlisted", "public"]).optional(),
        photos: z.array(z.string().url()).max(24).optional(),
        vehicle_id: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { ownedVehicleId } = await import("@/lib/rides.server");
    if ("vehicle_id" in patch) {
      patch.vehicle_id = await ownedVehicleId(context.supabase, context.userId, patch.vehicle_id);
    }
    const { error } = await context.supabase.from("rides").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteRide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("rides").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listVehicleRides = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ vehicleId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("rides")
      .select("id, title, distance_m, duration_s, avg_speed_kmh, started_at")
      .eq("user_id", context.userId)
      .eq("vehicle_id", data.vehicleId)
      .order("started_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
