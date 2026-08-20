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

    const { data: mods } = await client
      .from("vehicle_mods")
      .select("id, vehicle_id, category, title, brand")
      .in(
        "vehicle_id",
        vehicles.map((v) => v.id),
      )
      .order("created_at", { ascending: false })
      .limit(200);

    return vehicles.map((v) => ({
      ...v,
      mods: (mods ?? []).filter((m) => m.vehicle_id === v.id),
    }));
  });
