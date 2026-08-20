/**
 * ZombieRex AI Show Judge — public + owner server functions.
 *
 * Feature-flag gated: every entry point checks `feature_flags.judge.enabled`
 * (via judgeIsEnabled) and returns 404-ish empty state when off.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiCompleteJson } from "./ai-gateway.server";

// ---- helpers ---------------------------------------------------------------

const FEATURE_KEY = "judge.enabled";
const JUDGE_BUCKET = "documents";
const JUDGE_PREFIX = "judge";

export const judgeIsEnabled = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("feature_flags")
    .select("enabled")
    .eq("key", FEATURE_KEY)
    .maybeSingle();
  return { enabled: !!data?.enabled };
});

async function assertEnabled() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("feature_flags")
    .select("enabled")
    .eq("key", FEATURE_KEY)
    .maybeSingle();
  if (!data?.enabled) throw new Error("AI Show Judge is not enabled");
}

const MediaKind = z.enum([
  "exterior_360",
  "engine_bay",
  "suspension",
  "wheels",
  "exhaust",
  "interior",
  "walkaround_video",
  "startup_video",
  "exhaust_audio",
]);
export type MediaKind = z.infer<typeof MediaKind>;

// ---- public reads ----------------------------------------------------------

export const judgeListEvents = createServerFn({ method: "GET" })
  .validator((raw: unknown) =>
    z
      .object({ status: z.enum(["open", "judging", "closed", "published", "all"]).default("all") })
      .parse(raw ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("judge_events")
      .select(
        "id, slug, title, description, cover_url, status, registration_opens_at, registration_closes_at, judged_at, vehicle_types",
      )
      .eq("is_public", true)
      .in("status", ["open", "judging", "closed", "published"])
      .order("created_at", { ascending: false });
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const judgeGetEvent = createServerFn({ method: "GET" })
  .validator((raw: unknown) => z.object({ slug: z.string().min(1) }).parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: event, error } = await supabaseAdmin
      .from("judge_events")
      .select("*")
      .eq("slug", data.slug)
      .eq("is_public", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!event) return { event: null, entries: [] as any[] };

    let entries: any[] = [];
    if (event.status === "published") {
      const { data: rows } = await supabaseAdmin
        .from("judge_entries")
        .select(
          "id, display_name, make, model, year, vehicle_type, overall_score, awards, country, city",
        )
        .eq("event_id", event.id)
        .in("status", ["scored", "flagged"])
        .order("overall_score", { ascending: false, nullsFirst: false })
        .limit(200);
      entries = rows ?? [];
    }
    return { event, entries };
  });

export const judgeGetEntry = createServerFn({ method: "GET" })
  .validator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: entry, error } = await supabaseAdmin
      .from("judge_entries")
      .select(
        "*, judge_events!inner(id, slug, title, status, is_public, category_weights, award_categories)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!entry) return { entry: null, media: [] as any[], mediaUrls: {} as Record<string, string> };

    const evt = entry.judge_events as any;
    const publiclyVisible = evt.status === "published" && evt.is_public && entry.status !== "draft";
    if (!publiclyVisible)
      return { entry: null, media: [] as any[], mediaUrls: {} as Record<string, string> };

    const { data: media } = await supabaseAdmin
      .from("judge_entry_media")
      .select("id, kind, storage_path, mime, order_index")
      .eq("entry_id", entry.id)
      .order("order_index", { ascending: true });

    const mediaUrls: Record<string, string> = {};
    for (const m of media ?? []) {
      const { data: signed } = await supabaseAdmin.storage
        .from(JUDGE_BUCKET)
        .createSignedUrl(m.storage_path, 60 * 60);
      if (signed?.signedUrl) mediaUrls[m.id] = signed.signedUrl;
    }
    return { entry, media: media ?? [], mediaUrls };
  });

export const judgeGetLeaderboard = createServerFn({ method: "GET" })
  .validator((raw: unknown) =>
    z
      .object({
        scope: z
          .enum([
            "global",
            "event",
            "country",
            "city",
            "vehicle_type",
            "brand",
            "model",
            "engine_size",
          ])
          .default("global"),
        scope_key: z.string().optional(),
        event_id: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(200).default(50),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("judge_leaderboard_cache")
      .select("rank, score, entry_id, event_id, scope, scope_key")
      .eq("scope", data.scope)
      .order("rank", { ascending: true })
      .limit(data.limit);
    if (data.scope_key) q = q.eq("scope_key", data.scope_key);
    if (data.event_id) q = q.eq("event_id", data.event_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    if (!rows?.length) return [];

    const ids = rows.map((r) => r.entry_id);
    const { data: entries } = await supabaseAdmin
      .from("judge_entries")
      .select(
        "id, display_name, make, model, year, vehicle_type, awards, country, city, overall_score",
      )
      .in("id", ids);
    const byId = new Map((entries ?? []).map((e) => [e.id, e]));
    return rows.map((r) => ({ ...r, entry: byId.get(r.entry_id) ?? null }));
  });

// ---- authenticated ---------------------------------------------------------

export const judgeMyEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("judge_entries")
      .select(
        "id, event_id, display_name, make, model, year, status, overall_score, awards, created_at, judge_events(slug, title, status)",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const CreateEntrySchema = z.object({
  event_slug: z.string().min(1),
  vehicle_id: z.string().uuid().optional().nullable(),
  display_name: z.string().min(2).max(80),
  vehicle_type: z.enum(["motorcycle", "car"]),
  make: z.string().max(40).optional().nullable(),
  model: z.string().max(60).optional().nullable(),
  year: z.number().int().min(1900).max(2100).optional().nullable(),
  engine_cc: z.number().int().min(0).max(20000).optional().nullable(),
  country: z.string().max(80).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
});

export const judgeCreateEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => CreateEntrySchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertEnabled();
    const { data: evt, error: e1 } = await context.supabase
      .from("judge_events")
      .select("id, status")
      .eq("slug", data.event_slug)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!evt) throw new Error("Event not found");
    if (!["open", "judging"].includes(evt.status))
      throw new Error("Event is not accepting entries");

    const { data: existing } = await context.supabase
      .from("judge_entries")
      .select("id, status")
      .eq("event_id", evt.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing) return { id: existing.id, status: existing.status };

    // Only link a garage vehicle the caller owns.
    let vehicleId: string | null = data.vehicle_id ?? null;
    if (vehicleId) {
      const { data: owned } = await context.supabase
        .from("vehicles")
        .select("id")
        .eq("id", vehicleId)
        .eq("owner_id", context.userId)
        .is("deleted_at", null)
        .maybeSingle();
      if (!owned) vehicleId = null;
    }

    const { data: inserted, error } = await context.supabase
      .from("judge_entries")
      .insert({
        event_id: evt.id,
        vehicle_id: vehicleId,
        user_id: context.userId,
        display_name: data.display_name,
        vehicle_type: data.vehicle_type,
        make: data.make ?? null,
        model: data.model ?? null,
        year: data.year ?? null,
        engine_cc: data.engine_cc ?? null,
        country: data.country ?? null,
        city: data.city ?? null,
      })
      .select("id, status")
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

// Signed upload URL for entry media (path validated to owner + entry)
const SignUploadSchema = z.object({
  entry_id: z.string().uuid(),
  kind: MediaKind,
  filename: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[A-Za-z0-9._-]+$/, "Invalid filename"),
  content_type: z.string().min(3).max(120),
});

export const judgeSignEntryUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => SignUploadSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { data: entry, error: e1 } = await context.supabase
      .from("judge_entries")
      .select("id, user_id, status, event_id")
      .eq("id", data.entry_id)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!entry || entry.user_id !== context.userId) throw new Error("Forbidden");
    if (!["draft", "submitted"].includes(entry.status)) throw new Error("Entry is locked");

    const path = `${JUDGE_PREFIX}/${context.userId}/${entry.event_id}/${entry.id}/${data.kind}-${Date.now()}-${data.filename}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from(JUDGE_BUCKET)
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return {
      bucket: JUDGE_BUCKET,
      path: signed.path,
      token: signed.token,
      signed_url: signed.signedUrl,
    };
  });

const AttachMediaSchema = z.object({
  entry_id: z.string().uuid(),
  kind: MediaKind,
  storage_path: z.string().min(3).max(512),
  mime: z.string().max(120).optional(),
  sha256: z.string().length(64).optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  duration_ms: z.number().int().optional(),
  order_index: z.number().int().default(0),
});

export const judgeAttachMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => AttachMediaSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { data: entry } = await context.supabase
      .from("judge_entries")
      .select("id, user_id, event_id, status")
      .eq("id", data.entry_id)
      .maybeSingle();
    if (!entry || entry.user_id !== context.userId) throw new Error("Forbidden");
    if (!["draft", "submitted"].includes(entry.status)) throw new Error("Entry is locked");

    // Fraud/dup: same sha256 already submitted anywhere → auto-flag this entry.
    if (data.sha256) {
      const { data: dup } = await context.supabase
        .from("judge_entry_media")
        .select("id, entry_id")
        .eq("sha256", data.sha256)
        .neq("entry_id", entry.id)
        .limit(1)
        .maybeSingle();
      if (dup) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("judge_flags").insert({
          entry_id: entry.id,
          reason: "duplicate_media",
          detail: `sha256 matches entry ${dup.entry_id}`,
          created_by: context.userId,
        });
      }
    }

    const { data: row, error } = await context.supabase
      .from("judge_entry_media")
      .insert({ ...data })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const judgeListEntryMedia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => z.object({ entry_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: entry } = await context.supabase
      .from("judge_entries")
      .select("id, user_id")
      .eq("id", data.entry_id)
      .maybeSingle();
    if (!entry || entry.user_id !== context.userId) throw new Error("Forbidden");

    const { data: media, error } = await context.supabase
      .from("judge_entry_media")
      .select("id, kind, storage_path, mime, order_index, created_at")
      .eq("entry_id", data.entry_id)
      .order("order_index", { ascending: true });
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const urls: Record<string, string> = {};
    for (const m of media ?? []) {
      const { data: s } = await supabaseAdmin.storage
        .from(JUDGE_BUCKET)
        .createSignedUrl(m.storage_path, 60 * 30);
      if (s?.signedUrl) urls[m.id] = s.signedUrl;
    }
    return { media: media ?? [], urls };
  });

export const judgeRemoveMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => z.object({ media_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: media } = await context.supabase
      .from("judge_entry_media")
      .select("id, entry_id, storage_path, judge_entries!inner(user_id, status)")
      .eq("id", data.media_id)
      .maybeSingle();
    const entry = (media as any)?.judge_entries;
    if (!media || !entry || entry.user_id !== context.userId) throw new Error("Forbidden");
    if (entry.status !== "draft") throw new Error("Entry is locked");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.storage.from(JUDGE_BUCKET).remove([media.storage_path]);
    const { error } = await context.supabase
      .from("judge_entry_media")
      .delete()
      .eq("id", data.media_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Submit + score --------------------------------------------------------

export const judgeSubmitEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => z.object({ entry_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertEnabled();
    const { data: entry } = await context.supabase
      .from("judge_entries")
      .select("id, user_id, event_id, status")
      .eq("id", data.entry_id)
      .maybeSingle();
    if (!entry || entry.user_id !== context.userId) throw new Error("Forbidden");
    if (!["draft", "failed"].includes(entry.status))
      throw new Error("Entry cannot be submitted from current status");

    const { data: media } = await context.supabase
      .from("judge_entry_media")
      .select("id, kind")
      .eq("entry_id", data.entry_id);
    if (!media?.length || media.length < 3)
      throw new Error("Attach at least 3 media items before submitting");

    await context.supabase
      .from("judge_entries")
      .update({
        status: "processing",
        submitted_at: new Date().toISOString(),
        processing_error: null,
      })
      .eq("id", data.entry_id);

    // Fire-and-await scoring — client shows spinner. Errors flip status to 'failed'.
    try {
      await scoreEntryInternal(data.entry_id);
    } catch (err: any) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("judge_entries")
        .update({ status: "failed", processing_error: String(err?.message ?? err).slice(0, 500) })
        .eq("id", data.entry_id);
      throw err;
    }
    return { ok: true };
  });

// Server-only scorer — signs read URLs, calls AI, writes scores.
async function scoreEntryInternal(entryId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: entry, error: e1 } = await supabaseAdmin
    .from("judge_entries")
    .select(
      "id, event_id, vehicle_type, make, model, year, engine_cc, judge_events!inner(category_weights)",
    )
    .eq("id", entryId)
    .single();
  if (e1) throw new Error(e1.message);

  const weights = (entry.judge_events as any).category_weights as Record<string, number>;

  const { data: media } = await supabaseAdmin
    .from("judge_entry_media")
    .select("id, kind, storage_path, mime")
    .eq("entry_id", entryId);

  const photoParts: any[] = [];
  const audioNote: string[] = [];
  for (const m of media ?? []) {
    const { data: s } = await supabaseAdmin.storage
      .from(JUDGE_BUCKET)
      .createSignedUrl(m.storage_path, 60 * 30);
    if (!s?.signedUrl) continue;
    if ((m.mime ?? "").startsWith("image/")) {
      photoParts.push({
        type: "image_url",
        image_url: { url: s.signedUrl },
      });
    } else if ((m.mime ?? "").startsWith("audio/") || m.kind === "exhaust_audio") {
      audioNote.push(`- ${m.kind}: audio recording attached`);
    } else if ((m.mime ?? "").startsWith("video/")) {
      audioNote.push(`- ${m.kind}: walkaround/startup video attached`);
    }
  }

  const categoryList = Object.keys(weights).join(", ");
  const systemMsg = `You are a professional concours d'elegance judge for motorcycles and cars. Score with the strictness of a top-tier show judge.`;
  const userText = `Vehicle: ${entry.vehicle_type} ${entry.make ?? ""} ${entry.model ?? ""} ${entry.year ?? ""} ${entry.engine_cc ? `${entry.engine_cc}cc` : ""}
Media supplied:
${audioNote.length ? audioNote.join("\n") : "- (no audio/video attached)"}

Return STRICT JSON with this shape:
{
  "category_scores": { "<category>": <0-100 int>, ... }, // one per: ${categoryList}
  "defects": [ { "type": "scratch|paint_defect|rust|dent|oil_leak|loose_wiring|missing_hardware|tire_wear|brake_wear|poor_weld|corrosion|misaligned_panel|other", "severity": "minor|moderate|major", "note": "<short>" } ],
  "highlights": [ "<short highlight>" ],
  "suggestions": [ "<short improvement>" ],
  "engine_score": <0-100 int>,   // 0 if no engine media supplied
  "exhaust_score": <0-100 int>,  // 0 if no exhaust media supplied
  "ai_comments": "<paragraph, judge's overall notes>",
  "fraud_score": <0-100 int>      // 0 = clean, 100 = clearly fraudulent (stock photo, watermark, mismatched vehicle)
}
Base each score on the supplied images. If a category can't be assessed from the media, set it to 50 (neutral).`;

  const content: any[] = [{ type: "text", text: userText }, ...photoParts.slice(0, 20)];

  const result = await aiCompleteJson<{
    category_scores: Record<string, number>;
    defects: any[];
    highlights: string[];
    suggestions: string[];
    engine_score: number;
    exhaust_score: number;
    ai_comments: string;
    fraud_score: number;
  }>(
    [
      { role: "system", content: systemMsg },
      // aiComplete only sends text messages currently; if content is an array of parts
      // the string(json) fallback still applies. We pass a JSON-serialized preamble.
      { role: "user", content: JSON.stringify(content) },
    ],
    { model: "google/gemini-2.5-pro", temperature: 0.2, maxTokens: 2500 },
  );

  // Weighted overall
  let total = 0;
  let denom = 0;
  for (const [k, w] of Object.entries(weights)) {
    const s = Math.max(0, Math.min(100, Number(result.category_scores?.[k] ?? 50)));
    total += s * w;
    denom += w;
  }
  const overall = denom > 0 ? Math.round((total / denom) * 100) / 100 : 0;

  const { error: e2 } = await supabaseAdmin
    .from("judge_entries")
    .update({
      status: (result.fraud_score ?? 0) >= 70 ? "flagged" : "scored",
      overall_score: overall,
      category_scores: result.category_scores ?? {},
      defects: result.defects ?? [],
      highlights: result.highlights ?? [],
      suggestions: result.suggestions ?? [],
      engine_score: Math.max(0, Math.min(100, Number(result.engine_score ?? 0))),
      exhaust_score: Math.max(0, Math.min(100, Number(result.exhaust_score ?? 0))),
      ai_comments: result.ai_comments ?? null,
      fraud_score: Math.max(0, Math.min(100, Number(result.fraud_score ?? 0))),
      scored_at: new Date().toISOString(),
    })
    .eq("id", entryId);
  if (e2) throw new Error(e2.message);

  if ((result.fraud_score ?? 0) >= 70) {
    await supabaseAdmin.from("judge_flags").insert({
      entry_id: entryId,
      reason: "high_fraud_score",
      detail: `AI fraud_score=${result.fraud_score}`,
    });
  }
}
