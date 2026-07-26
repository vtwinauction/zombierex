/**
 * GDPR / CCPA data export — bundles a user's own data into a single JSON blob.
 * Returns rows the caller owns; RLS filters everything through the authenticated
 * supabase client, so no privileged access is used.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const exportMyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const uid = context.userId;
    const supabase = context.supabase;

    const grab = async <T,>(name: string, query: PromiseLike<{ data: T | null }>) => {
      try {
        const { data } = await query;
        return [name, data ?? []] as const;
      } catch {
        return [name, []] as const;
      }
    };

    const bundle = Object.fromEntries(
      await Promise.all([
        grab("profile", supabase.from("profiles").select("*").eq("id", uid)),
        grab("vehicles", supabase.from("vehicles").select("*").eq("owner_id", uid)),
        grab("posts", supabase.from("posts").select("*").eq("author_id", uid)),
        grab("comments", supabase.from("comments").select("*").eq("author_id", uid)),
        grab("reactions", supabase.from("reactions").select("*").eq("user_id", uid)),
        grab("follows_out", supabase.from("follows").select("*").eq("follower_id", uid)),
        grab("follows_in", supabase.from("follows").select("*").eq("followee_id", uid)),
        grab("listings", supabase.from("listings").select("*").eq("seller_id", uid)),
        grab("orders", supabase.from("orders").select("*").eq("buyer_id", uid)),
        grab("rides", supabase.from("rides").select("*").eq("rider_id", uid)),
        grab("routes", supabase.from("routes").select("*").eq("author_id", uid)),
        grab("drag_runs", supabase.from("drag_runs").select("*").eq("rider_id", uid)),
        grab("messages", supabase.from("messages").select("*").eq("sender_id", uid)),
        grab("notification_preferences", supabase.from("notification_preferences").select("*").eq("user_id", uid)),
        grab("achievements", supabase.from("user_achievements").select("*").eq("user_id", uid)),
        grab("emergency_contacts", supabase.from("emergency_contacts").select("*").eq("user_id", uid)),
      ]),
    );

    return {
      generated_at: new Date().toISOString(),
      user_id: uid,
      note: "ZOMBIEREX data export — includes rows you own. External data (crash reports, moderation actions) are excluded intentionally.",
      data: bundle,
    };
  });
