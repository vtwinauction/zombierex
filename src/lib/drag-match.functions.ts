/**
 * Drag Match — real rider-vs-rider drag racing.
 *
 * Flow:
 *   1. createChallenge  — challenger picks opponent handle, strip, tree, stake
 *   2. respondChallenge — opponent accepts (creates match in lobby) or declines
 *   3. markMatchReady   — each rider signals GPS lock, both ready → startMatch
 *   4. startMatch       — server stamps green_at (synchronised launch), status live
 *   5. pushTelemetry    — batched GPS samples during the run
 *   6. finalizeMatch    — server picks winner from telemetry when both cross line
 *
 * Realtime: clients subscribe to drag_matches + drag_match_telemetry.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const StripMode = z.enum(["eighth", "quarter"]);
const TreeMode = z.enum(["pro", "sportsman"]);

const CreateChallenge = z.object({
  opponent_handle: z.string().trim().min(1).max(60),
  strip_mode: StripMode.default("quarter"),
  tree_mode: TreeMode.default("sportsman"),
  stake_xp: z.number().int().min(0).max(5000).default(50),
  message: z.string().max(280).optional().nullable(),
});

export const createChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => CreateChallenge.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const handle = data.opponent_handle.replace(/^@/, "").trim();
    const { data: opp, error: oppErr } = await supabase
      .from("profiles").select("id, handle").ilike("handle", handle).maybeSingle();
    if (oppErr) throw new Error(oppErr.message);
    if (!opp) throw new Error(`No rider found with handle @${handle}`);
    if (opp.id === userId) throw new Error("You cannot challenge yourself");

    const { data: row, error } = await supabase
      .from("drag_challenges")
      .insert({
        challenger_id: userId,
        opponent_id: opp.id,
        strip_mode: data.strip_mode,
        tree_mode: data.tree_mode,
        stake_xp: data.stake_xp,
        message: data.message ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Fire a notification for the opponent (best effort)
    try {
      await supabase.from("notifications").insert({
        user_id: opp.id,
        actor_id: userId,
        kind: "system",
        payload: {
          title: "Drag challenge received",
          body: `You've been challenged to a ${data.strip_mode === "quarter" ? "1/4 mile" : "1/8 mile"} drag race.`,
          challenge_id: row.id,
          kind: "drag_challenge",
        },
      });
    } catch { /* noop */ }



    return { id: row.id as string };
  });

export const listChallenges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("drag_challenges")
      .select("id, challenger_id, opponent_id, strip_mode, tree_mode, stake_xp, status, match_id, expires_at, created_at, message")
      .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((data ?? []).flatMap((c) => [c.challenger_id, c.opponent_id])));
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id, handle, display_name, avatar_url").in("id", ids)
      : { data: [] as any[] };
    const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
    return (data ?? []).map((c) => ({
      ...c,
      challenger: byId.get(c.challenger_id) ?? null,
      opponent: byId.get(c.opponent_id) ?? null,
      me_is_opponent: c.opponent_id === userId,
    }));
  });

export const respondChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    id: z.string().uuid(),
    action: z.enum(["accept", "decline", "cancel"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ch, error } = await supabase
      .from("drag_challenges").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!ch) throw new Error("Challenge not found");
    if (ch.status !== "pending") throw new Error("Challenge is no longer pending");
    if (new Date(ch.expires_at).getTime() < Date.now()) {
      await supabase.from("drag_challenges").update({ status: "expired" }).eq("id", ch.id);
      throw new Error("Challenge has expired");
    }

    if (data.action === "cancel") {
      if (ch.challenger_id !== userId) throw new Error("Only the challenger can cancel");
      const { error: uErr } = await supabase.from("drag_challenges")
        .update({ status: "cancelled" }).eq("id", ch.id);
      if (uErr) throw new Error(uErr.message);
      return { status: "cancelled" as const };
    }
    if (ch.opponent_id !== userId) throw new Error("Only the challenged rider can respond");

    if (data.action === "decline") {
      const { error: uErr } = await supabase.from("drag_challenges")
        .update({ status: "declined" }).eq("id", ch.id);
      if (uErr) throw new Error(uErr.message);
      return { status: "declined" as const };
    }

    // Accept — create the match
    const { data: match, error: mErr } = await supabase.from("drag_matches").insert({
      challenge_id: ch.id,
      rider_a: ch.challenger_id,
      rider_b: ch.opponent_id,
      strip_mode: ch.strip_mode,
      tree_mode: ch.tree_mode,
      stake_xp: ch.stake_xp,
      status: "lobby",
    }).select("id").single();
    if (mErr) throw new Error(mErr.message);

    await supabase.from("drag_challenges")
      .update({ status: "accepted", match_id: match.id }).eq("id", ch.id);

    // Notify challenger (best effort)
    try {
      await supabase.from("notifications").insert({
        user_id: ch.challenger_id,
        actor_id: userId,
        kind: "system",
        payload: {
          title: "Challenge accepted",
          body: "Your opponent accepted the drag challenge. Meet at the lobby.",
          match_id: match.id,
          kind: "drag_match",
        },
      });
    } catch { /* noop */ }


    return { status: "accepted" as const, match_id: match.id as string };
  });

export const getMatch = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: m, error } = await supabase
      .from("drag_matches").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!m) throw new Error("Match not found");
    if (m.rider_a !== userId && m.rider_b !== userId) throw new Error("Not your match");
    const { data: profs } = await supabase.from("profiles")
      .select("id, handle, display_name, avatar_url")
      .in("id", [m.rider_a, m.rider_b]);
    const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
    return { ...m, rider_a_profile: byId.get(m.rider_a) ?? null, rider_b_profile: byId.get(m.rider_b) ?? null };
  });

export const markMatchReady = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid(), ready: z.boolean().default(true) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: m, error } = await supabase
      .from("drag_matches").select("id, rider_a, rider_b, ready_a, ready_b, status").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!m) throw new Error("Match not found");
    const isA = m.rider_a === userId;
    const isB = m.rider_b === userId;
    if (!isA && !isB) throw new Error("Not your match");
    if (!["lobby", "armed"].includes(m.status)) throw new Error("Match already started");

    type MatchUpdate = {
      ready_a?: boolean; ready_b?: boolean;
      status?: "lobby" | "armed" | "countdown" | "live" | "finished" | "void";
      green_at?: string | null;
    };
    const patch: MatchUpdate = isA ? { ready_a: data.ready } : { ready_b: data.ready };
    const bothReady = (isA ? data.ready : m.ready_a) && (isB ? data.ready : m.ready_b);
    if (bothReady) {
      patch.status = "countdown";
      // Green light in 4s so both clients can render the tree
      patch.green_at = new Date(Date.now() + 4000).toISOString();
    } else {
      patch.status = "armed";
      patch.green_at = null;
    }
    const { error: uErr } = await supabase.from("drag_matches").update(patch).eq("id", data.id);
    if (uErr) throw new Error(uErr.message);
    return { ok: true, green_at: patch.green_at ?? null };
  });


export const pushMatchTelemetry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    match_id: z.string().uuid(),
    samples: z.array(z.object({
      t_ms: z.number().int().min(0).max(120_000),
      distance_m: z.number().min(0).max(1200),
      speed_kmh: z.number().min(0).max(500),
      accuracy_m: z.number().min(0).max(500).optional().nullable(),
      lat: z.number().min(-90).max(90).optional().nullable(),
      lng: z.number().min(-180).max(180).optional().nullable(),
    })).min(1).max(80),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Server enforces status = live via a read; also flips to live on first sample
    const { data: m } = await supabase.from("drag_matches")
      .select("id, rider_a, rider_b, status, green_at").eq("id", data.match_id).maybeSingle();
    if (!m) throw new Error("Match not found");
    if (m.rider_a !== userId && m.rider_b !== userId) throw new Error("Not your match");
    if (!["countdown", "live"].includes(m.status)) throw new Error("Match not active");
    if (m.status === "countdown") {
      await supabase.from("drag_matches").update({ status: "live" }).eq("id", m.id);
    }
    const rows = data.samples.map((s) => ({
      match_id: data.match_id,
      rider_id: userId,
      t_ms: s.t_ms,
      distance_m: s.distance_m,
      speed_kmh: s.speed_kmh,
      accuracy_m: s.accuracy_m ?? null,
      lat: s.lat ?? null,
      lng: s.lng ?? null,
    }));
    const { error } = await supabase.from("drag_match_telemetry").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const finalizeMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: m } = await supabase.from("drag_matches").select("*").eq("id", data.id).maybeSingle();
    if (!m) throw new Error("Match not found");
    if (m.rider_a !== userId && m.rider_b !== userId) throw new Error("Not your match");
    if (m.status === "finished") return { ok: true, winner_id: m.winner_id, margin_s: m.margin_s };

    const target = m.strip_mode === "quarter" ? 402.336 : 201.168;
    const { data: tel, error } = await supabase.from("drag_match_telemetry")
      .select("rider_id, t_ms, distance_m, speed_kmh").eq("match_id", m.id).order("t_ms", { ascending: true });
    if (error) throw new Error(error.message);

    function pickResult(riderId: string) {
      const pts = (tel ?? []).filter((t) => t.rider_id === riderId);
      let finishMs: number | null = null; let trap: number | null = null; let peak = 0;
      for (let i = 1; i < pts.length; i++) {
        if (pts[i].speed_kmh > peak) peak = Number(pts[i].speed_kmh);
        if (finishMs == null && Number(pts[i].distance_m) >= target) {
          const a = pts[i - 1], b = pts[i];
          const da = Number(a.distance_m), db = Number(b.distance_m);
          const frac = db === da ? 0 : (target - da) / (db - da);
          finishMs = a.t_ms + frac * (b.t_ms - a.t_ms);
          trap = Number(a.speed_kmh) + frac * (Number(b.speed_kmh) - Number(a.speed_kmh));
        }
      }
      return { finish_s: finishMs != null ? finishMs / 1000 : null, trap_kmh: trap, peak_kmh: peak };
    }
    const rA = pickResult(m.rider_a);
    const rB = pickResult(m.rider_b);
    let winner_id: string | null = null; let margin_s: number | null = null;
    if (rA.finish_s != null && rB.finish_s != null) {
      winner_id = rA.finish_s < rB.finish_s ? m.rider_a : m.rider_b;
      margin_s = Math.abs(rA.finish_s - rB.finish_s);
    } else if (rA.finish_s != null) { winner_id = m.rider_a; }
    else if (rB.finish_s != null) { winner_id = m.rider_b; }

    const { error: uErr } = await supabase.from("drag_matches").update({
      status: "finished",
      winner_id,
      margin_s: margin_s != null ? Number(margin_s.toFixed(3)) : null,
      result_a: rA,
      result_b: rB,
    }).eq("id", m.id);
    if (uErr) throw new Error(uErr.message);

    // XP payout — best effort
    if (winner_id && m.stake_xp > 0) {
      await supabase.from("xp_events").insert({
        user_id: winner_id, amount: m.stake_xp, kind: "drag_match_win", ref_id: m.id,
      }).then(() => null).catch(() => null);
    }
    return { ok: true, winner_id, margin_s };
  });
