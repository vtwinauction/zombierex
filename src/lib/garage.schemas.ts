/**
 * Validation schemas + shared types for the Digital Garage.
 * Kept out of `garage.functions.ts` so that file stays a thin server-fn wrapper.
 */
import { z } from "zod";

export const VEHICLE_KINDS = [
  "motorcycle",
  "car",
  "truck",
  "scooter",
  "atv",
  "other",
] as const;

export const MOD_CATEGORIES = [
  "engine",
  "exhaust",
  "intake",
  "suspension",
  "brakes",
  "wheels",
  "bodywork",
  "electronics",
  "interior",
  "other",
] as const;

export const VehicleInput = z.object({
  kind: z.enum(VEHICLE_KINDS).default("motorcycle"),
  make: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(80),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  nickname: z.string().trim().max(80).nullable().optional(),
  hero_image_url: z.string().trim().url().max(2048).nullable().optional().or(z.literal("")),
  is_primary: z.boolean().optional(),
  spec: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

export const VehicleUpdate = VehicleInput.partial().extend({ id: z.string().uuid() });

export const IdInput = z.object({ id: z.string().uuid() });
export const VehicleIdInput = z.object({ vehicleId: z.string().uuid() });

export const ModInput = z.object({
  vehicle_id: z.string().uuid(),
  category: z.enum(MOD_CATEGORIES).default("other"),
  title: z.string().trim().min(1).max(120),
  brand: z.string().trim().max(80).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  cost_minor: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  currency: z.string().trim().length(3).default("BHD"),
  installed_on: z.string().trim().max(10).nullable().optional(),
  photo_url: z.string().trim().url().max(2048).nullable().optional().or(z.literal("")),
});

export const ServiceInput = z.object({
  vehicle_id: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  shop: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  odometer_km: z.number().int().min(0).max(5_000_000).nullable().optional(),
  cost_minor: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  currency: z.string().trim().length(3).default("BHD"),
  service_date: z.string().trim().max(10),
  due_date: z.string().trim().max(10).nullable().optional(),
  status: z.enum(["done", "upcoming"]).default("done"),
});

export type VehicleKind = (typeof VEHICLE_KINDS)[number];
export type ModCategory = (typeof MOD_CATEGORIES)[number];

/** Strip empty strings so optional URL fields clear cleanly. */
export function nullEmpty<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = v === "" ? null : v;
  return out as T;
}
