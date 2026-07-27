/**
 * Emergency SOS — server functions.
 * Owners manage their alerts and emergency contacts; a share_token gives
 * anonymous read access to the alert + live pings for the responder link.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Contact = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().email().max(160).optional().nullable(),
  relation: z.string().trim().max(60).optional().nullable(),
  is_primary: z.boolean().optional(),
});

export const listContacts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("emergency_contacts")
      .select("id,name,phone,email,relation,is_primary,created_at")
      .eq("user_id", userId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => Contact.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const row = { ...data, user_id: userId };
    const { data: out, error } = await supabase
      .from("emergency_contacts")
      .upsert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: out.id as string };
  });

export const deleteContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("emergency_contacts")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const AlertInput = z.object({
  kind: z.enum(["manual", "crash", "test"]).default("manual"),
  message: z.string().max(500).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  accuracy_m: z.number().min(0).max(100000).optional(),
  heading: z.number().optional().nullable(),
  speed_kmh: z.number().min(0).max(500).optional().nullable(),
  ride_id: z.string().uuid().optional().nullable(),
});

export const triggerSOS = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => AlertInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: contacts } = await supabase
      .from("emergency_contacts")
      .select("name,phone,email,relation,is_primary")
      .eq("user_id", userId);
    const { data: row, error } = await supabase
      .from("sos_alerts")
      .insert({
        user_id: userId,
        kind: data.kind,
        status: "active",
        message: data.message ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        accuracy_m: data.accuracy_m ?? null,
        heading: data.heading ?? null,
        speed_kmh: data.speed_kmh ?? null,
        ride_id: data.ride_id ?? null,
        contacts_snapshot: contacts ?? [],
      })
      .select("id,share_token,created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const PingInput = z.object({
  alert_id: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy_m: z.number().min(0).max(100000).optional(),
  speed_kmh: z.number().min(0).max(500).optional(),
  heading: z.number().optional(),
});

export const pushSOSPing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => PingInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error: pErr } = await supabase.from("sos_pings").insert({
      alert_id: data.alert_id,
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy_m: data.accuracy_m ?? null,
      speed_kmh: data.speed_kmh ?? null,
      heading: data.heading ?? null,
    });
    if (pErr) throw new Error(pErr.message);
    // keep the alert row's last-known coords fresh for the responder view
    await supabase
      .from("sos_alerts")
      .update({
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy_m: data.accuracy_m ?? null,
        speed_kmh: data.speed_kmh ?? null,
        heading: data.heading ?? null,
      })
      .eq("id", data.alert_id);
    return { ok: true };
  });

export const closeSOS = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["cancelled", "resolved"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("sos_alerts")
      .update({ status: data.status, resolved_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("sos_alerts")
      .select("id,kind,status,message,latitude,longitude,share_token,created_at,resolved_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
