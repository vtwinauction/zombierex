/**
 * Service booking workflow — customer + garage sides.
 * All handlers are RLS-scoped; garage-side handlers additionally verify
 * that the caller owns the vendor the booking belongs to.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  CreateBookingInput,
  BookingIdInput,
  UpdateBookingStatusInput,
  SendQuoteInput,
  QuoteDecisionInput,
  WorkMediaInput,
} from "@/lib/garages.schemas";

const BOOKING_COLS =
  "id, vendor_id, customer_id, service_id, service_ids, vehicle_id, scheduled_at, status, notes, " +
  "problem_text, media, work_media, quote_cents, quote_notes, quote_requested, currency, " +
  "status_history, contact_phone, checked_in_at, completed_at, cancelled_reason, created_at, updated_at";

type HistoryEntry = { status: string; at: string; by: string; note?: string };

function appendHistory(existing: unknown, entry: HistoryEntry) {
  const arr = Array.isArray(existing) ? (existing as HistoryEntry[]) : [];
  return [...arr, entry].slice(-50);
}

async function notify(userId: string, actorId: string, payload: Record<string, unknown>) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("notifications").insert({
    user_id: userId,
    actor_id: actorId,
    kind: "booking",
    payload: payload as never,
  });
}

/* ======================= CUSTOMER ======================= */

export const createBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => CreateBookingInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { publicClient } = await import("./public-db.server");
    const sb = publicClient();
    const { data: vendor } = await (sb as any)
      .from("vendors_public")
      .select("id, business_name, booking_enabled, currency, slug")
      .eq("id", data.vendor_id)
      .maybeSingle();
    if (!vendor) throw new Error("Garage not found");
    if (!(vendor as any).booking_enabled) throw new Error("This garage is not accepting bookings");

    if (data.vehicle_id) {
      const { data: veh } = await context.supabase
        .from("vehicles")
        .select("id")
        .eq("id", data.vehicle_id)
        .eq("owner_id", context.userId)
        .maybeSingle();
      if (!veh) throw new Error("Vehicle not found in your garage");
    }

    const scheduledAt = new Date(`${data.date}T${data.time}:00`);
    if (Number.isNaN(scheduledAt.getTime())) throw new Error("Invalid date/time");

    const { data: row, error } = await context.supabase
      .from("bookings")
      .insert({
        vendor_id: data.vendor_id,
        customer_id: context.userId,
        service_id: data.service_ids[0] ?? null,
        service_ids: data.service_ids,
        vehicle_id: data.vehicle_id ?? null,
        scheduled_at: scheduledAt.toISOString(),
        status: "requested",
        problem_text: data.problem_text ?? null,
        notes: data.problem_text ?? null,
        media: (data.media ?? []) as never,
        quote_requested: data.quote_requested ?? false,
        contact_phone: data.contact_phone ?? null,
        currency: (vendor as any).currency ?? "BHD",
        status_history: [
          { status: "requested", at: new Date().toISOString(), by: context.userId },
        ] as never,
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: owner } = await supabaseAdmin
      .from("vendors")
      .select("owner_id")
      .eq("id", data.vendor_id)
      .maybeSingle();
    if (owner?.owner_id) {
      await notify(owner.owner_id, context.userId, {
        title: "New booking request",
        body: `A rider requested a service at ${(vendor as any).business_name}.`,
        link: `/vendor/bookings`,
        booking_id: row.id,
      });
    }

    return { id: row.id as string };
  });

export const listMyBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("bookings")
      .select(BOOKING_COLS)
      .eq("customer_id", context.userId)
      .order("scheduled_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return await decorate(data ?? []);
  });

export const getBooking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => BookingIdInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("bookings")
      .select(BOOKING_COLS)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Not found");
    const [full] = await decorate([row]);
    return full;
  });

export const cancelBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => BookingIdInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("bookings")
      .select("id, customer_id, vendor_id, status, status_history")
      .eq("id", data.id)
      .maybeSingle();
    if (!row || row.customer_id !== context.userId) throw new Error("Forbidden");
    if (row.status === "completed") throw new Error("Completed bookings cannot be cancelled");

    const { error } = await context.supabase
      .from("bookings")
      .update({
        status: "cancelled",
        cancelled_reason: "Cancelled by customer",
        status_history: appendHistory(row.status_history, {
          status: "cancelled",
          at: new Date().toISOString(),
          by: context.userId,
        }) as never,
      } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: vendor } = await supabaseAdmin
      .from("vendors")
      .select("owner_id")
      .eq("id", row.vendor_id)
      .maybeSingle();
    if (vendor?.owner_id)
      await notify(vendor.owner_id, context.userId, {
        title: "Booking cancelled",
        body: "A customer cancelled their booking.",
        link: "/vendor/bookings",
        booking_id: row.id,
      });
    return { ok: true };
  });

export const respondToQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => QuoteDecisionInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("bookings")
      .select("id, customer_id, vendor_id, status, status_history")
      .eq("id", data.id)
      .maybeSingle();
    if (!row || row.customer_id !== context.userId) throw new Error("Forbidden");

    const status = data.accept ? "confirmed" : "cancelled";
    const { error } = await context.supabase
      .from("bookings")
      .update({
        status,
        cancelled_reason: data.accept ? null : "Quotation declined",
        status_history: appendHistory(row.status_history, {
          status,
          at: new Date().toISOString(),
          by: context.userId,
          note: data.accept ? "Quotation accepted" : "Quotation declined",
        }) as never,
      } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: vendor } = await supabaseAdmin
      .from("vendors")
      .select("owner_id")
      .eq("id", row.vendor_id)
      .maybeSingle();
    if (vendor?.owner_id)
      await notify(vendor.owner_id, context.userId, {
        title: data.accept ? "Quotation accepted" : "Quotation declined",
        body: data.accept ? "The customer approved your quote." : "The customer declined your quote.",
        link: "/vendor/bookings",
        booking_id: row.id,
      });
    return { ok: true, status };
  });

/* ======================= GARAGE ======================= */

async function requireVendor(context: { supabase: any; userId: string }) {
  const { data: vendor } = await context.supabase
    .from("vendors")
    .select("id, business_name, owner_id")
    .eq("owner_id", context.userId)
    .maybeSingle();
  if (!vendor) throw new Error("No business profile — apply as a garage first");
  return vendor as { id: string; business_name: string; owner_id: string };
}

export const listVendorBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const vendor = await requireVendor(context as never);
    const { data, error } = await context.supabase
      .from("bookings")
      .select(BOOKING_COLS)
      .eq("vendor_id", vendor.id)
      .order("scheduled_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { vendor, bookings: await decorate(data ?? []) };
  });

export const updateBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => UpdateBookingStatusInput.parse(raw))
  .handler(async ({ data, context }) => {
    const vendor = await requireVendor(context as never);
    const { data: row } = await context.supabase
      .from("bookings")
      .select("id, vendor_id, customer_id, status, status_history")
      .eq("id", data.id)
      .eq("vendor_id", vendor.id)
      .maybeSingle();
    if (!row) throw new Error("Forbidden");

    const patch: Record<string, unknown> = {
      status: data.status,
      status_history: appendHistory(row.status_history, {
        status: data.status,
        at: new Date().toISOString(),
        by: context.userId,
        ...(data.note ? { note: data.note } : {}),
      }),
    };
    if (data.scheduled_at) patch["scheduled_at"] = data.scheduled_at;
    if (data.status === "checked_in") patch["checked_in_at"] = new Date().toISOString();
    if (data.status === "completed") patch["completed_at"] = new Date().toISOString();
    if (data.status === "cancelled") patch["cancelled_reason"] = data.note ?? "Cancelled by garage";

    const { error } = await context.supabase.from("bookings").update(patch as never).eq("id", data.id);
    if (error) throw new Error(error.message);

    if (data.status === "completed") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.rpc("noop" as never).catch(() => undefined);
      const { data: v } = await supabaseAdmin
        .from("vendors")
        .select("completed_jobs_count")
        .eq("id", vendor.id)
        .maybeSingle();
      await supabaseAdmin
        .from("vendors")
        .update({ completed_jobs_count: ((v as any)?.completed_jobs_count ?? 0) + 1 } as never)
        .eq("id", vendor.id);
    }

    await notify(row.customer_id, context.userId, {
      title: `Booking ${data.status.replace(/_/g, " ")}`,
      body: `${vendor.business_name} updated your service booking.`,
      link: `/bookings/${row.id}`,
      booking_id: row.id,
    });
    return { ok: true };
  });

export const sendQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => SendQuoteInput.parse(raw))
  .handler(async ({ data, context }) => {
    const vendor = await requireVendor(context as never);
    const { data: row } = await context.supabase
      .from("bookings")
      .select("id, customer_id, status_history")
      .eq("id", data.id)
      .eq("vendor_id", vendor.id)
      .maybeSingle();
    if (!row) throw new Error("Forbidden");

    const { error } = await context.supabase
      .from("bookings")
      .update({
        quote_cents: data.quote_cents,
        quote_notes: data.quote_notes ?? null,
        status: "quotation_sent",
        status_history: appendHistory(row.status_history, {
          status: "quotation_sent",
          at: new Date().toISOString(),
          by: context.userId,
        }) as never,
      } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await notify(row.customer_id, context.userId, {
      title: "Quotation received",
      body: `${vendor.business_name} sent you a price for your service.`,
      link: `/bookings/${row.id}`,
      booking_id: row.id,
    });
    return { ok: true };
  });

export const addWorkMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => WorkMediaInput.parse(raw))
  .handler(async ({ data, context }) => {
    const vendor = await requireVendor(context as never);
    const { data: row } = await context.supabase
      .from("bookings")
      .select("id, customer_id, work_media")
      .eq("id", data.id)
      .eq("vendor_id", vendor.id)
      .maybeSingle();
    if (!row) throw new Error("Forbidden");

    const existing = Array.isArray(row.work_media) ? (row.work_media as unknown[]) : [];
    const additions = data.urls.map((url) => ({
      url,
      caption: data.caption ?? null,
      at: new Date().toISOString(),
    }));
    const { error } = await context.supabase
      .from("bookings")
      .update({ work_media: [...existing, ...additions].slice(-40) as never } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await notify(row.customer_id, context.userId, {
      title: "Work update",
      body: `${vendor.business_name} added photos of your vehicle.`,
      link: `/bookings/${row.id}`,
      booking_id: row.id,
    });
    return { ok: true };
  });

/* ======================= helpers ======================= */

/** Attach garage, vehicle and service names to booking rows. */
async function decorate(rows: any[]) {
  if (!rows.length) return [];
  const { publicClient } = await import("./public-db.server");
  const sb = publicClient();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const vendorIds = Array.from(new Set(rows.map((r) => r.vendor_id)));
  const vehicleIds = Array.from(new Set(rows.map((r) => r.vehicle_id).filter(Boolean)));
  const serviceIds = Array.from(
    new Set(rows.flatMap((r) => [...(r.service_ids ?? []), r.service_id]).filter(Boolean)),
  );
  const customerIds = Array.from(new Set(rows.map((r) => r.customer_id)));

  const [{ data: vendors }, { data: vehicles }, { data: services }, { data: people }] =
    await Promise.all([
      (sb as any)
        .from("vendors_public")
        .select("id, slug, business_name, logo_url, city, phone, is_verified")
        .in("id", vendorIds),
      vehicleIds.length
        ? supabaseAdmin
            .from("vehicles")
            .select("id, make, model, year, nickname, hero_image_url")
            .in("id", vehicleIds as string[])
        : Promise.resolve({ data: [] as any[] }),
      serviceIds.length
        ? sb.from("services").select("id, name, price_cents").in("id", serviceIds as string[])
        : Promise.resolve({ data: [] as any[] }),
      supabaseAdmin.from("profiles").select("id, display_name, avatar_url").in("id", customerIds),
    ]);

  const vMap = new Map((vendors ?? []).map((v: any) => [v.id, v]));
  const vehMap = new Map((vehicles ?? []).map((v: any) => [v.id, v]));
  const sMap = new Map((services ?? []).map((s: any) => [s.id, s]));
  const pMap = new Map((people ?? []).map((p: any) => [p.id, p]));

  return rows.map((r) => ({
    ...r,
    garage: vMap.get(r.vendor_id) ?? null,
    vehicle: r.vehicle_id ? (vehMap.get(r.vehicle_id) ?? null) : null,
    customer: pMap.get(r.customer_id) ?? null,
    services: [...new Set([...(r.service_ids ?? []), r.service_id].filter(Boolean))]
      .map((id) => sMap.get(id))
      .filter(Boolean),
  }));
}
