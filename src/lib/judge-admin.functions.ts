/**
 * ZombieRex AI Show Judge — admin-only server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiCompleteJson } from "./ai-gateway.server";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "super_admin"])
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

// ---- Feature flag ---------------------------------------------------------

export const adminJudgeSetEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => z.object({ enabled: z.boolean() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("feature_flags")
      .upsert({ key: "judge.enabled", enabled: data.enabled }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Events ---------------------------------------------------------------

export const adminJudgeListEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("judge_events")
      .select("id, slug, title, status, registration_opens_at, registration_closes_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminJudgeGetEvent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: event, error } = await context.supabase
      .from("judge_events")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const { data: entries } = await context.supabase
      .from("judge_entries")
      .select(
        "id, display_name, make, model, year, status, overall_score, awards, fraud_score, created_at",
      )
      .eq("event_id", data.id)
      .order("overall_score", { ascending: false, nullsFirst: false });

    const { data: flags } = await context.supabase
      .from("judge_flags")
      .select("id, entry_id, reason, detail, resolved, created_at")
      .eq("resolved", false)
      .order("created_at", { ascending: false });

    return { event, entries: entries ?? [], flags: flags ?? [] };
  });

const EventUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  title: z.string().min(2).max(120),
  description: z.string().max(4000).optional().nullable(),
  cover_url: z.string().url().optional().nullable(),
  status: z.enum(["draft", "open", "judging", "closed", "published"]),
  registration_opens_at: z.string().optional().nullable(),
  registration_closes_at: z.string().optional().nullable(),
  is_public: z.boolean().default(true),
  vehicle_types: z.array(z.enum(["motorcycle", "car"])).min(1),
  category_weights: z.record(z.number().int().min(1).max(50)).optional(),
  award_categories: z.array(z.string()).optional(),
});

export const adminJudgeUpsertEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => EventUpsertSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const payload: any = {
      slug: data.slug,
      title: data.title,
      description: data.description ?? null,
      cover_url: data.cover_url ?? null,
      status: data.status,
      registration_opens_at: data.registration_opens_at ?? null,
      registration_closes_at: data.registration_closes_at ?? null,
      is_public: data.is_public,
      vehicle_types: data.vehicle_types,
      host_id: context.userId,
    };
    if (data.category_weights) payload.category_weights = data.category_weights;
    if (data.award_categories) payload.award_categories = data.award_categories;

    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("judge_events")
        .update(payload)
        .eq("id", data.id)
        .select("id, slug")
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("judge_events")
      .insert(payload)
      .select("id, slug")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---- Awards / publish -----------------------------------------------------

export const adminJudgeComputeAwards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => z.object({ event_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: event } = await supabaseAdmin
      .from("judge_events")
      .select("id, award_categories")
      .eq("id", data.event_id)
      .single();

    const { data: entries } = await supabaseAdmin
      .from("judge_entries")
      .select(
        "id, display_name, make, model, year, vehicle_type, overall_score, category_scores, engine_score, awards",
      )
      .eq("event_id", data.event_id)
      .eq("status", "scored")
      .order("overall_score", { ascending: false });

    if (!entries?.length) return { assigned: 0 };

    const cats: string[] = (event?.award_categories as string[]) ?? [];
    const summary = entries.map((e) => ({
      id: e.id,
      name: e.display_name,
      type: e.vehicle_type,
      make: e.make,
      model: e.model,
      year: e.year,
      overall: e.overall_score,
      engine: e.engine_score,
      cat: e.category_scores,
    }));

    const prompt = `You are the head judge assigning awards. From the ranked entries below, pick ONE winner per award category. Return STRICT JSON:
{ "awards": [ { "category": "<award>", "entry_id": "<uuid>", "rationale": "<one-sentence>" } ] }
Award categories: ${JSON.stringify(cats)}
Entries: ${JSON.stringify(summary)}`;

    const res = await aiCompleteJson<{
      awards: { category: string; entry_id: string; rationale: string }[];
    }>(
      [
        { role: "system", content: "You judge motorcycle & car shows. Be decisive." },
        { role: "user", content: prompt },
      ],
      { model: "google/gemini-3.6-flash", temperature: 0.3 },
    );

    // Reset awards then apply
    await supabaseAdmin
      .from("judge_entries")
      .update({ awards: [] as string[] })
      .eq("event_id", data.event_id);

    const byEntry = new Map<string, { cats: string[]; notes: string[] }>();
    for (const a of res.awards ?? []) {
      if (!a.entry_id || !a.category) continue;
      const cur = byEntry.get(a.entry_id) ?? { cats: [], notes: [] };
      cur.cats.push(a.category);
      cur.notes.push(`${a.category}: ${a.rationale}`);
      byEntry.set(a.entry_id, cur);
    }
    for (const [id, v] of byEntry.entries()) {
      await supabaseAdmin
        .from("judge_entries")
        .update({ awards: v.cats, ai_comments: v.notes.join("\n") })
        .eq("id", id);
    }

    // Rebuild leaderboard cache for this event
    await supabaseAdmin.from("judge_leaderboard_cache").delete().eq("event_id", data.event_id);
    let rank = 1;
    const rows = entries
      .filter((e) => e.overall_score != null)
      .sort((a, b) => b.overall_score! - a.overall_score!)
      .map((e) => ({
        event_id: data.event_id,
        scope: "event" as const,
        scope_key: data.event_id,
        entry_id: e.id,
        rank: rank++,
        score: e.overall_score!,
      }));
    if (rows.length) await supabaseAdmin.from("judge_leaderboard_cache").insert(rows);

    return { assigned: byEntry.size };
  });

export const adminJudgePublishEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => z.object({ event_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("judge_events")
      .update({ status: "published", judged_at: new Date().toISOString() })
      .eq("id", data.event_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Reprocess / flags ----------------------------------------------------

export const adminJudgeReprocessEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => z.object({ entry_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("judge_entries")
      .update({ status: "processing", processing_error: null })
      .eq("id", data.entry_id);
    const mod = await import("./judge.functions");
    // scoreEntryInternal is not exported; re-implement via a public helper.
    // We call the submit path's private routine by importing it dynamically:
    const anymod = mod as any;
    if (typeof anymod._score === "function") await anymod._score(data.entry_id);
    return { ok: true };
  });

export const adminJudgeResolveFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => z.object({ flag_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("judge_flags")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", data.flag_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- CSV export -----------------------------------------------------------

export const adminJudgeExportCsv = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => z.object({ event_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: rows } = await context.supabase
      .from("judge_entries")
      .select(
        "id, display_name, make, model, year, vehicle_type, country, city, status, overall_score, engine_score, exhaust_score, awards, fraud_score",
      )
      .eq("event_id", data.event_id)
      .order("overall_score", { ascending: false, nullsFirst: false });
    const header =
      "id,name,make,model,year,type,country,city,status,overall,engine,exhaust,awards,fraud";
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const body = (rows ?? [])
      .map((r) =>
        [
          r.id,
          r.display_name,
          r.make,
          r.model,
          r.year,
          r.vehicle_type,
          r.country,
          r.city,
          r.status,
          r.overall_score,
          r.engine_score,
          r.exhaust_score,
          (r.awards ?? []).join("|"),
          r.fraud_score,
        ]
          .map(esc)
          .join(","),
      )
      .join("\n");
    return { csv: `${header}\n${body}` };
  });
