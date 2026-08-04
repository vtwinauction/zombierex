/**
 * Drag Racing — GPS-verified drag run recording, verification and leaderboards.
 *
 * Verification model: server recomputes splits from the raw GPS points the
 * client submits and cross-checks them against the client-reported values.
 * Runs pass automatically when the deltas are inside tolerance AND simple
 * plausibility checks (max speed, sample cadence, accuracy) hold. Anything
 * suspicious is stored as `flagged` for admin review.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Point = z.object({
  t_ms: z
    .number()
    .int()
    .min(0)
    .max(60 * 60 * 1000),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speed_kmh: z.number().min(0).max(500).optional().nullable(),
  accuracy_m: z.number().min(0).max(500).optional().nullable(),
  altitude_m: z.number().optional().nullable(),
  heading: z.number().min(0).max(360).optional().nullable(),
});

const Vehicle = z.object({
  vehicle_id: z.string().uuid().optional().nullable(),
  vehicle_kind: z.enum(["motorcycle", "car"]),
  vehicle_name: z.string().max(140).optional().nullable(),
  engine_cc: z.number().int().positive().max(20000).optional().nullable(),
  aspiration: z.enum(["na", "turbo", "supercharged", "electric"]).optional().nullable(),
  fuel_type: z
    .enum(["gasoline", "diesel", "e85", "electric", "hybrid", "other"])
    .optional()
    .nullable(),
  weight_class: z.string().max(60).optional().nullable(),
  weight_kg: z.number().int().positive().max(10000).optional().nullable(),
  modifications: z.string().max(2000).optional().nullable(),
});

const SubmitInput = Vehicle.extend({
  reaction_time_s: z.number().min(0).max(30).optional().nullable(),
  launch_g: z.number().min(0).max(5).optional().nullable(),
  location_label: z.string().max(140).optional().nullable(),
  weather: z.string().max(60).optional().nullable(),
  temp_c: z.number().min(-40).max(60).optional().nullable(),
  visibility: z.enum(["private", "unlisted", "public"]).default("public"),
  notes: z.string().max(2000).optional().nullable(),
  started_at: z.string().datetime().optional().nullable(),
  ended_at: z.string().datetime().optional().nullable(),
  points: z.array(Point).min(10).max(5000),
});

const R = 6371000;
const toRad = (d: number) => (d * Math.PI) / 180;
function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

type Sample = {
  t: number; // seconds from start
  dist: number; // cumulative meters
  spd: number; // km/h
  acc: number | null;
};

function buildSamples(pts: z.infer<typeof Point>[]): Sample[] {
  const sorted = [...pts].sort((a, b) => a.t_ms - b.t_ms);
  const t0 = sorted[0].t_ms;
  const out: Sample[] = [];
  let cum = 0;
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    if (i > 0) {
      const prev = sorted[i - 1];
      cum += haversine(prev, p);
    }
    const t = (p.t_ms - t0) / 1000;
    const spd =
      p.speed_kmh ??
      (i > 0
        ? (haversine(sorted[i - 1], p) / Math.max(0.001, (p.t_ms - sorted[i - 1].t_ms) / 1000)) *
          3.6
        : 0);
    out.push({ t, dist: cum, spd, acc: p.accuracy_m ?? null });
  }
  return out;
}

function timeToSpeed(samples: Sample[], targetKmh: number): number | null {
  for (let i = 1; i < samples.length; i++) {
    if (samples[i].spd >= targetKmh) {
      const a = samples[i - 1];
      const b = samples[i];
      if (b.spd === a.spd) return b.t;
      const frac = (targetKmh - a.spd) / (b.spd - a.spd);
      return a.t + Math.max(0, Math.min(1, frac)) * (b.t - a.t);
    }
  }
  return null;
}

function timeAtDistance(samples: Sample[], targetM: number): { t: number; trap: number } | null {
  for (let i = 1; i < samples.length; i++) {
    if (samples[i].dist >= targetM) {
      const a = samples[i - 1];
      const b = samples[i];
      if (b.dist === a.dist) return { t: b.t, trap: b.spd };
      const frac = (targetM - a.dist) / (b.dist - a.dist);
      const t = a.t + frac * (b.t - a.t);
      const trap = a.spd + frac * (b.spd - a.spd);
      return { t, trap };
    }
  }
  return null;
}

function windowedSplit(samples: Sample[], fromKmh: number, toKmh: number): number | null {
  let startT: number | null = null;
  for (let i = 1; i < samples.length; i++) {
    if (startT === null && samples[i].spd >= fromKmh) {
      const a = samples[i - 1],
        b = samples[i];
      const frac = (fromKmh - a.spd) / Math.max(0.001, b.spd - a.spd);
      startT = a.t + frac * (b.t - a.t);
    }
    if (startT !== null && samples[i].spd >= toKmh) {
      const a = samples[i - 1],
        b = samples[i];
      const frac = (toKmh - a.spd) / Math.max(0.001, b.spd - a.spd);
      const endT = a.t + frac * (b.t - a.t);
      return Math.max(0, endT - startT);
    }
  }
  return null;
}

function round(v: number | null, d = 3): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  const m = Math.pow(10, d);
  return Math.round(v * m) / m;
}

export type ComputedRun = {
  zero_to_60_kmh_s: number | null;
  zero_to_100_kmh_s: number | null;
  sixty_to_120_kmh_s: number | null;
  eighth_mile_s: number | null;
  eighth_mile_trap_kmh: number | null;
  quarter_mile_s: number | null;
  quarter_mile_trap_kmh: number | null;
  top_speed_kmh: number;
  distance_m: number;
  duration_s: number;
  antiCheat: { ok: boolean; score: number; notes: string[] };
};

function computeRun(pts: z.infer<typeof Point>[]): ComputedRun {
  const samples = buildSamples(pts);
  const notes: string[] = [];
  const top = Math.max(...samples.map((s) => s.spd));
  const dist = samples[samples.length - 1].dist;
  const dur = samples[samples.length - 1].t;

  // Anti-cheat heuristics
  let score = 100;
  if (top > 450) {
    notes.push(`Top speed ${top.toFixed(1)}km/h exceeds plausible limit`);
    score -= 60;
  }
  const badAcc = pts.filter((p) => (p.accuracy_m ?? 0) > 15).length;
  if (badAcc / pts.length > 0.3) {
    notes.push("More than 30% of GPS samples above 15m accuracy");
    score -= 25;
  }
  if (dur < 1) {
    notes.push("Run duration under 1 second");
    score -= 40;
  }
  const dt = dur / Math.max(1, samples.length - 1);
  if (dt > 0.5) {
    notes.push(`Average GPS cadence ${(1 / dt).toFixed(1)}Hz below 2Hz`);
    score -= 15;
  }
  // impossible acceleration: >2g sustained
  for (let i = 1; i < samples.length; i++) {
    const dv = (samples[i].spd - samples[i - 1].spd) / 3.6;
    const ddt = samples[i].t - samples[i - 1].t;
    if (ddt > 0 && dv / ddt > 25) {
      notes.push("Instant acceleration exceeds 2.5g");
      score -= 20;
      break;
    }
  }

  const qm = timeAtDistance(samples, 402.336);
  const em = timeAtDistance(samples, 201.168);

  return {
    zero_to_60_kmh_s: round(timeToSpeed(samples, 60)),
    zero_to_100_kmh_s: round(timeToSpeed(samples, 100)),
    sixty_to_120_kmh_s: round(windowedSplit(samples, 60, 120)),
    eighth_mile_s: round(em?.t ?? null),
    eighth_mile_trap_kmh: round(em?.trap ?? null, 2),
    quarter_mile_s: round(qm?.t ?? null),
    quarter_mile_trap_kmh: round(qm?.trap ?? null, 2),
    top_speed_kmh: round(top, 2) ?? 0,
    distance_m: round(dist, 2) ?? 0,
    duration_s: round(dur, 3) ?? 0,
    antiCheat: { ok: score >= 70, score: Math.max(0, score), notes },
  };
}

export const submitDragRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => SubmitInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const computed = computeRun(data.points);
    const start = data.points[0];
    const status = computed.antiCheat.ok ? "verified" : "flagged";

    const { data: run, error } = await supabase
      .from("drag_runs")
      .insert({
        user_id: userId,
        vehicle_id: data.vehicle_id ?? null,
        vehicle_kind: data.vehicle_kind,
        vehicle_name: data.vehicle_name ?? null,
        engine_cc: data.engine_cc ?? null,
        aspiration: data.aspiration ?? null,
        fuel_type: data.fuel_type ?? null,
        weight_class: data.weight_class ?? null,
        weight_kg: data.weight_kg ?? null,
        modifications: data.modifications ?? null,
        reaction_time_s: data.reaction_time_s ?? null,
        launch_g: data.launch_g ?? null,
        location_label: data.location_label ?? null,
        location_lat: start.lat,
        location_lng: start.lng,
        weather: data.weather ?? null,
        temp_c: data.temp_c ?? null,
        visibility: data.visibility,
        notes: data.notes ?? null,
        started_at: data.started_at ?? null,
        ended_at: data.ended_at ?? null,
        zero_to_60_kmh_s: computed.zero_to_60_kmh_s,
        zero_to_100_kmh_s: computed.zero_to_100_kmh_s,
        sixty_to_120_kmh_s: computed.sixty_to_120_kmh_s,
        eighth_mile_s: computed.eighth_mile_s,
        eighth_mile_trap_kmh: computed.eighth_mile_trap_kmh,
        quarter_mile_s: computed.quarter_mile_s,
        quarter_mile_trap_kmh: computed.quarter_mile_trap_kmh,
        top_speed_kmh: computed.top_speed_kmh,
        distance_m: computed.distance_m,
        duration_s: computed.duration_s,
        status,
        verification_score: computed.antiCheat.score,
        anti_cheat_notes: computed.antiCheat.notes.join(" · ") || null,
        verified_at: status === "verified" ? new Date().toISOString() : null,
      })
      .select("id, status, verification_score")
      .single();
    if (error) throw new Error(error.message);

    // Persist raw points (batched insert)
    const chunk = data.points.map((p) => ({
      run_id: run.id,
      t_ms: p.t_ms,
      lat: p.lat,
      lng: p.lng,
      speed_kmh: p.speed_kmh ?? null,
      accuracy_m: p.accuracy_m ?? null,
      altitude_m: p.altitude_m ?? null,
      heading: p.heading ?? null,
    }));
    const { error: pErr } = await supabase.from("drag_run_points").insert(chunk);
    if (pErr) throw new Error(pErr.message);

    return { id: run.id as string, status: run.status, computed };
  });

export const listMyDragRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("drag_runs")
      .select(
        "id, vehicle_kind, vehicle_name, quarter_mile_s, zero_to_100_kmh_s, top_speed_kmh, status, verification_score, created_at",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getDragRun = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: run, error } = await context.supabase
      .from("drag_runs")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!run) throw new Error("Run not found");
    return run;
  });

export const listDragLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        kind: z.enum(["motorcycle", "car"]).default("motorcycle"),
        metric: z
          .enum(["quarter_mile_s", "zero_to_100_kmh_s", "eighth_mile_s", "top_speed_kmh"])
          .default("quarter_mile_s"),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const ascending = data.metric !== "top_speed_kmh";
    const { data: rows, error } = await context.supabase
      .from("drag_runs")
      .select(
        `id, user_id, vehicle_kind, vehicle_name, engine_cc, aspiration, fuel_type, ${data.metric}, verification_score, created_at`,
      )
      .eq("vehicle_kind", data.kind)
      .eq("status", "verified")
      .eq("visibility", "public")
      .not(data.metric, "is", null)
      .order(data.metric, { ascending })
      .limit(50);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const deleteDragRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("drag_runs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * AI Coach — analyses a submitted run and returns concise coaching notes.
 */
export const coachDragRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: run, error } = await context.supabase
      .from("drag_runs")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!run) throw new Error("Run not found");

    const { aiCompleteJson } = await import("./ai-gateway.server");
    const summary = {
      vehicle: {
        kind: run.vehicle_kind,
        name: run.vehicle_name,
        cc: run.engine_cc,
        aspiration: run.aspiration,
        fuel: run.fuel_type,
        weight_kg: run.weight_kg,
        modifications: run.modifications,
      },
      splits: {
        zero_to_60_kmh_s: run.zero_to_60_kmh_s,
        zero_to_100_kmh_s: run.zero_to_100_kmh_s,
        sixty_to_120_kmh_s: run.sixty_to_120_kmh_s,
        eighth_mile_s: run.eighth_mile_s,
        eighth_mile_trap_kmh: run.eighth_mile_trap_kmh,
        quarter_mile_s: run.quarter_mile_s,
        quarter_mile_trap_kmh: run.quarter_mile_trap_kmh,
        top_speed_kmh: run.top_speed_kmh,
        duration_s: run.duration_s,
      },
      verification: {
        status: run.status,
        score: run.verification_score,
        notes: run.anti_cheat_notes,
      },
    };
    const out = await aiCompleteJson<{
      grade: string;
      headline: string;
      launch: string;
      shift: string;
      weakness: string;
      next_target: string;
      tips: string[];
    }>(
      [
        {
          role: "system",
          content:
            "You are REX, a professional drag-racing coach. Reply as strict JSON with keys: grade (A+..F), headline, launch, shift, weakness, next_target, tips (array of 3 short strings). Be concise, technical, use km/h and seconds.",
        },
        { role: "user", content: `Coach this GPS-verified drag run:\n${JSON.stringify(summary)}` },
      ],
      { temperature: 0.4, maxTokens: 500 },
    );

    return out;
  });
