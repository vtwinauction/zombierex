/**
 * Garage / workshop discovery + profile server functions.
 * Public reads use the publishable client; owner mutations use requireSupabaseAuth.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  GarageSearchInput,
  GarageProfileInput,
  AvailabilityInput,
  GarageBusinessInput,
  ServiceInput,
  ServiceIdInput,
} from "@/lib/garages.schemas";

export const searchGarages = createServerFn({ method: "GET" })
  .validator((raw: unknown) => GarageSearchInput.parse(raw))
  .handler(async ({ data }) => {
    const { publicClient } = await import("./public-db.server");
    const sb = publicClient();
    const { data: rows, error } = await (sb as any).rpc("garage_search", {
      _lat: data.lat ?? null,
      _lng: data.lng ?? null,
      _q: data.q ?? null,
      _specialties: data.specialties?.length ? data.specialties : null,
      _vehicle_type: data.vehicle_type ?? null,
      _brand: data.brand ?? null,
      _emergency: data.emergency ?? null,
      _limit: data.limit ?? 40,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []) as any[];
  });

const PROFILE_COLS =
  "id, slug, business_name, business_type, description, logo_url, cover_url, gallery, portfolio, " +
  "services_showcase, contact_channels, website, phone, email, socials, operating_hours, " +
  "address_line1, city, region, country, lat, lng, is_verified, is_premium, specialties, brands, " +
  "vehicle_types, emergency_service, response_time_mins, completed_jobs_count, price_from_cents, " +
  "currency, certifications, team, policies, payment_methods, booking_enabled, availability, " +
  "rating_avg, reviews_count, followers_count, created_at";

/** Full public workshop profile: business data, services, reviews. */
export const getGarageProfile = createServerFn({ method: "GET" })
  .validator((raw: unknown) => GarageProfileInput.parse(raw))
  .handler(async ({ data }) => {
    const { publicClient } = await import("./public-db.server");
    const sb = publicClient();
    const q = (sb as any).from("vendors_public").select(PROFILE_COLS);
    const { data: vendor, error } = await (data.slug
      ? q.eq("slug", data.slug)
      : q.eq("id", data.id!)
    ).maybeSingle();
    if (error) throw new Error(error.message);
    if (!vendor) return null;

    const [{ data: services }, { data: reviews }] = await Promise.all([
      sb
        .from("services")
        .select("id, name, description, price_cents, duration_minutes")
        .eq("vendor_id", (vendor as any).id)
        .eq("is_active", true)
        .order("price_cents", { ascending: true }),
      sb
        .from("business_reviews")
        .select("id, rating, body, created_at, reviewer_id")
        .eq("vendor_id", (vendor as any).id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    // Attach reviewer display names (public profile fields only).
    const ids = Array.from(new Set((reviews ?? []).map((r: any) => r.reviewer_id))).filter(Boolean);
    let people: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
    if (ids.length) {
      const { data: profs } = await sb
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", ids as string[]);
      people = Object.fromEntries(
        (profs ?? []).map((p: any) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url }]),
      );
    }

    return {
      vendor: vendor as any,
      services: services ?? [],
      reviews: (reviews ?? []).map((r: any) => ({ ...r, reviewer: people[r.reviewer_id] ?? null })),
    };
  });

/** Slots for a date with already-taken times removed. */
export const getGarageAvailability = createServerFn({ method: "GET" })
  .validator((raw: unknown) => AvailabilityInput.parse(raw))
  .handler(async ({ data }) => {
    const { publicClient } = await import("./public-db.server");
    const { slotsForDate } = await import("./garage-taxonomy");
    const sb = publicClient();
    const { data: vendor } = await (sb as any)
      .from("vendors_public")
      .select("id, availability, booking_enabled")
      .eq("id", data.vendor_id)
      .maybeSingle();
    if (!vendor) return { slots: [], taken: [] as string[] };

    const slots = slotsForDate(data.date, (vendor as any).availability ?? null);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const dayStart = new Date(`${data.date}T00:00:00`).toISOString();
    const dayEnd = new Date(`${data.date}T23:59:59`).toISOString();
    const { data: taken } = await supabaseAdmin
      .from("bookings")
      .select("scheduled_at, status")
      .eq("vendor_id", data.vendor_id)
      .gte("scheduled_at", dayStart)
      .lte("scheduled_at", dayEnd);

    const busy = (taken ?? [])
      .filter((b: any) => b.status !== "cancelled")
      .map((b: any) => {
        const d = new Date(b.scheduled_at);
        return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
      });

    return { slots, taken: busy };
  });

/* ================= OWNER SIDE ================= */

export const getMyGarage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: vendor, error } = await context.supabase
      .from("vendors")
      .select("*")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!vendor) return { vendor: null, services: [], subscription: null };

    const [{ data: services }, { data: sub }] = await Promise.all([
      context.supabase
        .from("services")
        .select("id, name, description, price_cents, duration_minutes, is_active")
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: true }),
      context.supabase
        .from("subscriptions")
        .select(
          "id, status, current_period_end, trial_ends_at, plan:subscription_plans(code, name, tier, price_cents, currency, features)",
        )
        .eq("vendor_id", vendor.id)
        .in("status", ["active", "trialing", "past_due"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return { vendor, services: services ?? [], subscription: sub ?? null };
  });

export const updateMyGarageBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => GarageBusinessInput.parse(raw))
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) if (v !== undefined) patch[k] = v;
    const { error } = await context.supabase
      .from("vendors")
      .update(patch as any)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertGarageService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => ServiceInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { data: vendor } = await context.supabase
      .from("vendors")
      .select("id")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!vendor) throw new Error("No business profile yet");

    const row = {
      vendor_id: vendor.id,
      name: data.name,
      description: data.description ?? null,
      price_cents: data.price_cents ?? null,
      duration_minutes: data.duration_minutes ?? null,
      is_active: data.is_active ?? true,
    };
    const query = data.id
      ? context.supabase.from("services").update(row).eq("id", data.id).eq("vendor_id", vendor.id)
      : context.supabase.from("services").insert(row);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteGarageService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => ServiceIdInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { data: vendor } = await context.supabase
      .from("vendors")
      .select("id")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!vendor) throw new Error("Forbidden");
    const { error } = await context.supabase
      .from("services")
      .delete()
      .eq("id", data.id)
      .eq("vendor_id", vendor.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
