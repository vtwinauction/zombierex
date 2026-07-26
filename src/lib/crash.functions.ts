import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const CrashSchema = z.object({
  message: z.string().min(1).max(2000),
  stack: z.string().max(20_000).optional(),
  route: z.string().max(500).optional(),
  userAgent: z.string().max(500).optional(),
  platform: z.string().max(50).optional(),
  appVersion: z.string().max(50).optional(),
  mechanism: z.string().max(50).optional(),
  userId: z.string().uuid().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export const submitCrashReport = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof CrashSchema>) => CrashSchema.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const supabase = createClient<Database>(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    // Anonymous flood control: dedupe near-identical reports (same message +
    // route + user agent) within the last 30s to blunt unauth spam. The
    // authenticated `check_rate_limit` primitive can't be used here because
    // crash reports must accept anon inserts (users may be signed out when
    // the app crashes).
    try {
      const since = new Date(Date.now() - 30_000).toISOString();
      const { data: recent } = await supabase
        .from("crash_reports")
        .select("id")
        .eq("message", data.message.slice(0, 2000))
        .eq("route", data.route ?? null)
        .eq("user_agent", data.userAgent ?? null)
        .gte("created_at", since)
        .limit(1)
        .maybeSingle();
      if (recent) return { ok: true as const, deduped: true };
    } catch { /* dedupe best-effort */ }

    const { error } = await supabase.from("crash_reports").insert({
      user_id: data.userId ?? null,
      message: data.message.slice(0, 2000),
      stack: data.stack?.slice(0, 20_000) ?? null,
      route: data.route ?? null,
      user_agent: data.userAgent ?? null,
      platform: data.platform ?? null,
      app_version: data.appVersion ?? null,
      mechanism: data.mechanism ?? null,
      context: (data.context ?? {}) as never,
    });

    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
