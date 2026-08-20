/**
 * Digital Garage server functions — authenticated, RLS-scoped.
 * Vehicles are publicly readable; mods are public per-vehicle; service
 * records are private to the owner.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  IdInput,
  ModInput,
  ServiceInput,
  VehicleIdInput,
  VehicleInput,
  VehicleUpdate,
  nullEmpty,
} from "@/lib/garage.schemas";

export const listMyVehicles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("vehicles")
      .select(
        "id, kind, make, model, year, nickname, spec, hero_image_url, is_primary, odometer_km, created_at",
      )
      .eq("owner_id", context.userId)
      .is("deleted_at", null)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getVehicle = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => IdInput.parse(raw))
  .handler(async ({ data, context }) => {
    const [vehicle, mods, service] = await Promise.all([
      context.supabase
        .from("vehicles")
        .select(
          "id, owner_id, kind, make, model, year, nickname, spec, hero_image_url, is_primary, odometer_km, created_at",
        )
        .eq("id", data.id)
        .is("deleted_at", null)
        .maybeSingle(),
      context.supabase
        .from("vehicle_mods")
        .select("*")
        .eq("vehicle_id", data.id)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("vehicle_service_records")
        .select("*")
        .eq("vehicle_id", data.id)
        .order("service_date", { ascending: false }),
    ]);
    if (vehicle.error) throw new Error(vehicle.error.message);
    if (!vehicle.data) throw new Error("Vehicle not found");
    return {
      vehicle: vehicle.data,
      isOwner: vehicle.data.owner_id === context.userId,
      mods: mods.data ?? [],
      service: service.data ?? [],
    };
  });

export const createVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => VehicleInput.parse(raw))
  .handler(async ({ data, context }) => {
    const uid = context.userId;
    const { count } = await context.supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", uid)
      .is("deleted_at", null);

    const makePrimary = data.is_primary ?? (count ?? 0) === 0;
    const { data: row, error } = await context.supabase
      .from("vehicles")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(nullEmpty({ ...data, owner_id: uid, is_primary: makePrimary }) as any)
      .select()
      .single();
    if (error) throw new Error(error.message);

    if (makePrimary) {
      await context.supabase
        .from("vehicles")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ is_primary: false } as any)
        .eq("owner_id", uid)
        .neq("id", row.id);
    }
    return row;
  });

export const updateVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => VehicleUpdate.parse(raw))
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { data: row, error } = await context.supabase
      .from("vehicles")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(nullEmpty(patch) as any)
      .eq("id", id)
      .eq("owner_id", context.userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const setPrimaryVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => IdInput.parse(raw))
  .handler(async ({ data, context }) => {
    const uid = context.userId;
    const { error } = await context.supabase
      .from("vehicles")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ is_primary: true } as any)
      .eq("id", data.id)
      .eq("owner_id", uid);
    if (error) throw new Error(error.message);
    await context.supabase
      .from("vehicles")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ is_primary: false } as any)
      .eq("owner_id", uid)
      .neq("id", data.id);
    return { ok: true };
  });

export const deleteVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => IdInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("vehicles")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ deleted_at: new Date().toISOString(), is_primary: false } as any)
      .eq("id", data.id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addMod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => ModInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("vehicle_mods")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(nullEmpty({ ...data, owner_id: context.userId }) as any)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteMod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => IdInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("vehicle_mods")
      .delete()
      .eq("id", data.id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addServiceRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => ServiceInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("vehicle_service_records")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(nullEmpty({ ...data, owner_id: context.userId }) as any)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteServiceRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => IdInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("vehicle_service_records")
      .delete()
      .eq("id", data.id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listVehicleMods = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => VehicleIdInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("vehicle_mods")
      .select("*")
      .eq("vehicle_id", data.vehicleId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listVehicleJudgeEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => VehicleIdInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("judge_entries")
      .select(
        "id, display_name, status, overall_score, awards, created_at, judge_events(slug, title, status)",
      )
      .eq("vehicle_id", data.vehicleId)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
