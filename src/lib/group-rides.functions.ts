/**
 * Live Group Ride Tracking — create/join/ping/leave.
 * Rides are discovered via short join codes; live positions stream over Realtime.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function randCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

export const createGroupRide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      title: z.string().trim().min(1).max(80).default("Group Ride"),
      meet_lat: z.number().optional().nullable(),
      meet_lng: z.number().optional().nullable(),
      meet_label: z.string().max(160).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    let code = randCode();
    // Try a few times if collision
    for (let i = 0; i < 4; i++) {
      const { data: existing } = await supabase.from("group_rides").select("id").eq("join_code", code).maybeSingle();
      if (!existing) break;
      code = randCode();
    }
    const { data: ride, error } = await supabase
      .from("group_rides")
      .insert({
        host_id: context.userId,
        title: data.title,
        join_code: code,
        meet_lat: data.meet_lat ?? null,
        meet_lng: data.meet_lng ?? null,
        meet_label: data.meet_label ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    await supabase.from("group_ride_members").insert({
      group_ride_id: ride.id,
      user_id: context.userId,
      role: "host",
    });
    return ride;
  });

export const joinGroupRide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().trim().min(4).max(12) }).parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const code = data.code.toUpperCase();
    const { data: found, error: rpcErr } = await supabase.rpc("find_group_ride_by_code", { _code: code });
    if (rpcErr) throw rpcErr;
    const match = Array.isArray(found) ? found[0] : found;
    if (!match) throw new Error("Ride not found or ended.");
    await supabase
      .from("group_ride_members")
      .upsert({ group_ride_id: match.id, user_id: context.userId, role: "rider" }, { onConflict: "group_ride_id,user_id" });
    const { data: ride } = await supabase.from("group_rides").select("*").eq("id", match.id).maybeSingle();
    return ride ?? match;
  });

export const getGroupRide = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: ride } = await supabase.from("group_rides").select("*").eq("id", data.id).maybeSingle();
    if (!ride) throw new Error("Ride not found.");
    const { data: membersRaw } = await supabase
      .from("group_ride_members")
      .select("user_id, role, joined_at")
      .eq("group_ride_id", data.id);
    const userIds = (membersRaw ?? []).map((m) => m.user_id);
    const { data: profs } = userIds.length
      ? await supabase.from("profiles").select("id, handle, display_name, avatar_url").in("id", userIds)
      : { data: [] as any[] };
    const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    const members = (membersRaw ?? []).map((m) => ({ ...m, profiles: profMap.get(m.user_id) ?? null }));
    // Latest ping per member (last 10 min)
    const { data: pings } = await supabase
      .from("group_ride_pings")
      .select("user_id, lat, lng, speed_kmh, heading, battery, created_at")
      .eq("group_ride_id", data.id)
      .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(500);
    const latest: Record<string, any> = {};
    for (const p of pings ?? []) if (!latest[p.user_id]) latest[p.user_id] = p;
    return { ride, members, latest };
  });

export const sendGroupPing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      group_ride_id: z.string().uuid(),
      lat: z.number(),
      lng: z.number(),
      speed_kmh: z.number().min(0).max(500).optional().nullable(),
      heading: z.number().min(0).max(360).optional().nullable(),
      battery: z.number().min(0).max(1).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { error } = await supabase.from("group_ride_pings").insert({
      group_ride_id: data.group_ride_id,
      user_id: context.userId,
      lat: data.lat,
      lng: data.lng,
      speed_kmh: data.speed_kmh ?? null,
      heading: data.heading ?? null,
      battery: data.battery ?? null,
    });
    if (error) throw error;
    return { ok: true };
  });

export const leaveGroupRide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ group_ride_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    await supabase
      .from("group_ride_members")
      .delete()
      .eq("group_ride_id", data.group_ride_id)
      .eq("user_id", context.userId);
    return { ok: true };
  });

export const endGroupRide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ group_ride_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { error } = await supabase
      .from("group_rides")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", data.group_ride_id)
      .eq("host_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const listMyGroupRides = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const { data: memberships } = await supabase
      .from("group_ride_members")
      .select("group_ride_id, role")
      .eq("user_id", context.userId);
    const ids = (memberships ?? []).map((m) => m.group_ride_id);
    if (!ids.length) return [];
    const { data: rides } = await supabase
      .from("group_rides")
      .select("*")
      .in("id", ids)
      .order("created_at", { ascending: false })
      .limit(20);
    return rides ?? [];
  });
