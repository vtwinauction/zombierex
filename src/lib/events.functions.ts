/**
 * Events server functions — Phase 7.
 * Public list/get accessible to authenticated users (RLS scopes visibility).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const EVENT_CATEGORIES = [
  "ride",
  "bike_night",
  "car_meet",
  "cars_coffee",
  "drag",
  "drift",
  "track_day",
  "rally",
  "off_road",
  "monster_truck",
  "bike_show",
  "custom_bike_show",
  "classic_show",
  "supercar_meet",
  "festival",
  "charity",
  "launch",
  "workshop",
  "other",
] as const;

const EventInput = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(4000).optional().default(""),
  category: z.enum(EVENT_CATEGORIES).default("other"),
  visibility: z.enum(["public", "private", "unlisted"]).default("public"),
  cover_url: z.string().url().optional().nullable(),
  cover_video_url: z.string().url().optional().nullable(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime().optional().nullable(),
  location: z.string().trim().max(240).optional().default(""),
  address: z.string().trim().max(400).optional().nullable(),
  gps_lat: z.number().optional().nullable(),
  gps_lng: z.number().optional().nullable(),
  timezone: z.string().max(80).optional().nullable(),
  max_attendees: z.number().int().positive().optional().nullable(),
  hashtags: z.array(z.string().max(60)).max(20).optional().default([]),
  rules: z.string().max(4000).optional().nullable(),
  contact_email: z.string().email().optional().nullable().or(z.literal("")),
  contact_phone: z.string().max(60).optional().nullable(),
  club_id: z.string().uuid().optional().nullable(),
});

export const createEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => EventInput.parse(raw))
  .handler(async ({ data, context }) => {
    const payload = {
      ...data,
      contact_email: data.contact_email === "" ? null : data.contact_email,
      host_id: context.userId,
    };
    const { data: row, error } = await context.supabase
      .from("events")
      .insert(payload)
      .select("id, host_id, title, status")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ id: z.string().uuid(), patch: EventInput.partial() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("events")
      .update(data.patch)
      .eq("id", data.id)
      .eq("host_id", context.userId)
      .select("id, host_id, title, status")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const cancelEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("events")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("host_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listEvents = createServerFn({ method: "GET" })
  .validator((raw) =>
    z
      .object({
        scope: z
          .enum(["upcoming", "featured", "week", "month", "past", "mine"])
          .default("upcoming"),
        category: z.enum(EVENT_CATEGORIES).optional(),
        search: z.string().trim().max(120).optional(),
        limit: z.number().int().min(1).max(50).default(24),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const supabase = createClient(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
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

    let q = supabase
      .from("events")
      .select(
        "id, title, cover_url, category, starts_at, ends_at, location, rsvp_count, host_id, status, is_featured, visibility",
      )
      .neq("status", "cancelled")
      .eq("visibility", "public")
      .order("starts_at", { ascending: true })
      .limit(data.limit);

    const now = new Date().toISOString();
    if (data.scope === "upcoming") q = q.gte("starts_at", now);
    if (data.scope === "featured") q = q.eq("is_featured", true).gte("starts_at", now);
    if (data.scope === "week") {
      const end = new Date();
      end.setDate(end.getDate() + 7);
      q = q.gte("starts_at", now).lte("starts_at", end.toISOString());
    }
    if (data.scope === "month") {
      const end = new Date();
      end.setMonth(end.getMonth() + 1);
      q = q.gte("starts_at", now).lte("starts_at", end.toISOString());
    }
    if (data.scope === "past") q = q.lt("starts_at", now).order("starts_at", { ascending: false });
    if (data.scope === "mine") return [];
    if (data.category) q = q.eq("category", data.category);
    if (data.search) q = q.ilike("title", `%${data.search}%`);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getEvent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: eventRow, error } = await context.supabase
      .from("events")
      .select(
        "id, host_id, club_id, title, description, cover_url, location, starts_at, ends_at, rsvp_count, created_at, updated_at, event_type, guest_limit, gps_lat, gps_lng, category, visibility, status, max_attendees, address, timezone, hashtags, rules, cover_video_url, is_featured, comments_count, photos_count, cancelled_at",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!eventRow) return null;

    // Host contact details are protected — only the host/staff can read them.
    let contact: { contact_email: string | null; contact_phone: string | null } = {
      contact_email: null,
      contact_phone: null,
    };
    if (eventRow.host_id === context.userId) {
      const { data: c } = await context.supabase.rpc("get_event_contact", { _event_id: data.id });
      const row = Array.isArray(c) ? c[0] : c;
      if (row) contact = row;
    }
    const event = { ...eventRow, ...contact };

    const sb = context.supabase;
    const eq = { event_id: data.id } as const;
    const [
      { data: rsvp },
      { data: host },
      { count: interestedCount },
      { count: notGoingCount },
      { count: goingCount },
      { count: photosCount },
      { count: commentsCount },
      { count: checkinsCount },
    ] = await Promise.all([
      sb
        .from("event_rsvps")
        .select("status")
        .match({ ...eq, user_id: context.userId })
        .maybeSingle(),
      sb
        .from("profiles")
        .select("id, handle, display_name, avatar_url, tier, is_verified")
        .eq("id", event.host_id)
        .maybeSingle(),
      sb
        .from("event_rsvps")
        .select("*", { count: "exact", head: true })
        .match({ ...eq, status: "interested" }),
      sb
        .from("event_rsvps")
        .select("*", { count: "exact", head: true })
        .match({ ...eq, status: "not_going" }),
      sb
        .from("event_rsvps")
        .select("*", { count: "exact", head: true })
        .match({ ...eq, status: "going" }),
      sb.from("event_photos").select("*", { count: "exact", head: true }).match(eq),
      sb.from("event_comments").select("*", { count: "exact", head: true }).match(eq),
      sb.from("event_checkins").select("*", { count: "exact", head: true }).match(eq),
    ]);

    return {
      ...event,
      my_rsvp: rsvp?.status ?? null,
      host: host ? { ...host, verified: host.is_verified } : null,
      rsvp_count: goingCount ?? event.rsvp_count ?? 0,
      interested_count: interestedCount ?? 0,
      not_going_count: notGoingCount ?? 0,
      photos_count: photosCount ?? 0,
      comments_count: commentsCount ?? 0,
      checkins_count: checkinsCount ?? 0,
    };
  });

export const rsvpEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        event_id: z.string().uuid(),
        status: z.enum(["going", "interested", "not_going"]),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    if (data.status === "not_going") {
      await context.supabase
        .from("event_rsvps")
        .delete()
        .eq("event_id", data.event_id)
        .eq("user_id", context.userId);
    } else {
      const { error } = await context.supabase
        .from("event_rsvps")
        .upsert(
          { event_id: data.event_id, user_id: context.userId, status: data.status },
          { onConflict: "event_id,user_id" },
        );
      if (error) throw new Error(error.message);
    }

    const { count } = await context.supabase
      .from("event_rsvps")
      .select("*", { count: "exact", head: true })
      .eq("event_id", data.event_id)
      .eq("status", "going");
    await context.supabase
      .from("events")
      .update({ rsvp_count: count ?? 0 })
      .eq("id", data.event_id);

    return { ok: true, status: data.status };
  });

export const listAttendees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        event_id: z.string().uuid(),
        status: z.enum(["going", "interested"]).default("going"),
        limit: z.number().int().min(1).max(100).default(50),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("event_rsvps")
      .select(
        "user_id, status, profiles:profiles!event_rsvps_user_id_fkey(id, handle, display_name, avatar_url, tier)",
      )
      .eq("event_id", data.event_id)
      .eq("status", data.status)
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const checkInEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        event_id: z.string().uuid(),
        lat: z.number().optional().nullable(),
        lng: z.number().optional().nullable(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("event_checkins").upsert(
      {
        event_id: data.event_id,
        user_id: context.userId,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
      },
      { onConflict: "event_id,user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listEventComments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({ event_id: z.string().uuid(), limit: z.number().int().min(1).max(100).default(50) })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("event_comments")
      .select(
        "id, user_id, body, created_at, profiles:profiles!event_comments_user_id_fkey(handle, display_name, avatar_url, tier)",
      )
      .eq("event_id", data.event_id)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const commentOnEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z.object({ event_id: z.string().uuid(), body: z.string().trim().min(1).max(2000) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("event_comments")
      .insert({ event_id: data.event_id, user_id: context.userId, body: data.body })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listEventPhotos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({ event_id: z.string().uuid(), limit: z.number().int().min(1).max(100).default(60) })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("event_photos")
      .select("id, user_id, media_url, media_type, caption, created_at")
      .eq("event_id", data.event_id)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const addEventPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        event_id: z.string().uuid(),
        media_url: z.string().url(),
        media_type: z.enum(["image", "video"]).default("image"),
        caption: z.string().max(500).optional().nullable(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("event_photos")
      .insert({
        event_id: data.event_id,
        user_id: context.userId,
        media_url: data.media_url,
        media_type: data.media_type,
        caption: data.caption ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ event_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("event_announcements")
      .select("id, title, body, created_at, author_id")
      .eq("event_id", data.event_id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const announceEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        event_id: z.string().uuid(),
        title: z.string().max(160).optional(),
        body: z.string().trim().min(1).max(4000),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("event_announcements")
      .insert({
        event_id: data.event_id,
        author_id: context.userId,
        title: data.title ?? null,
        body: data.body,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const inviteToEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        event_id: z.string().uuid(),
        invitee_ids: z.array(z.string().uuid()).min(1).max(50),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const rows = data.invitee_ids.map((id) => ({
      event_id: data.event_id,
      inviter_id: context.userId,
      invitee_id: id,
    }));
    const { error } = await context.supabase
      .from("event_invites")
      .upsert(rows, { onConflict: "event_id,invitee_id" });
    if (error) throw new Error(error.message);
    return { ok: true, count: rows.length };
  });

export const listMyEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw) =>
    z
      .object({
        scope: z.enum(["upcoming", "past", "hosting", "all"]).default("upcoming"),
        limit: z.number().int().min(1).max(50).default(24),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    const now = new Date().toISOString();
    const { data: rsvps } = await context.supabase
      .from("event_rsvps")
      .select("event_id, status")
      .eq("user_id", context.userId)
      .neq("status", "not_going");

    const eventIds = (rsvps ?? []).map((r) => r.event_id);
    let q = context.supabase
      .from("events")
      .select(
        "id, title, cover_url, category, starts_at, ends_at, location, rsvp_count, host_id, status, is_featured, visibility",
      )
      .or(`id.in.(${eventIds.join(",")}),host_id.eq.${context.userId}`)
      .neq("status", "cancelled")
      .order("starts_at", { ascending: true })
      .limit(data.limit);

    if (data.scope === "upcoming") q = q.gte("starts_at", now);
    if (data.scope === "past") q = q.lt("starts_at", now).order("starts_at", { ascending: false });
    if (data.scope === "hosting") q = q.eq("host_id", context.userId).gte("starts_at", now);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const rsvpMap = new Map((rsvps ?? []).map((r) => [r.event_id, r.status]));
    return (rows ?? []).map((e: any) => ({
      ...e,
      my_rsvp: rsvpMap.get(e.id) ?? null,
      is_host: e.host_id === context.userId,
    }));
  });
