import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ConfirmSchema = z.object({ confirm: z.literal("DELETE") });

/**
 * Deletes the caller's own auth user + cascades all owned rows via FK cascade.
 * Apple App Store requires an in-app account deletion path (Guideline 5.1.1(v)).
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ConfirmSchema.parse(input))
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Best-effort scrub of profile PII before removing the auth user, in case
    // any related tables use SET NULL rather than CASCADE.
    await supabaseAdmin.from("profiles").update({
      display_name: "Deleted rider",
      bio: "",
      avatar_url: "",
      cover_url: "",
    } as never).eq("id", userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
