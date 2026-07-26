import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { moderateText } from "./moderation-text.server";

export const checkTextSafety = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z.object({
      text: z.string().min(1).max(8000),
      surface: z.enum(["post", "comment", "dm", "bio", "listing"]).optional(),
    }).parse(raw),
  )
  .handler(async ({ data }) => {
    return await moderateText(data.text);
  });
