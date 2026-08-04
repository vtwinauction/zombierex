/**
 * AI image moderation — Gemini vision via Lovable AI Gateway.
 * Called from the composer after upload, before publish.
 * Returns { safe, categories, reason }. Fail-open on gateway errors so a
 * flaky AI provider never blocks legitimate posts.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { moderateImageUrl } from "./moderation-image.server";

export const moderateImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => z.object({ url: z.string().url() }).parse(raw))
  .handler(async ({ data }) => {
    return await moderateImageUrl(data.url);
  });
