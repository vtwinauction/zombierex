import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ListInput = z.object({ limit: z.number().min(1).max(200).optional() });

export type CrashRow = {
  id: string;
  message: string;
  stack: string | null;
  route: string | null;
  platform: string | null;
  mechanism: string | null;
  app_version: string | null;
  user_id: string | null;
  created_at: string;
};

export const listCrashReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: z.infer<typeof ListInput>) => ListInput.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    // Verify the caller is actually an admin — supabase RLS also blocks
    // non-admin reads, but returning a clean error avoids leaking the shape.
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) return { rows: [] as CrashRow[], error: "Forbidden" as const };

    const { data: rows, error } = await context.supabase
      .from("crash_reports")
      .select("id, message, stack, route, platform, mechanism, app_version, user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);

    if (error) return { rows: [] as CrashRow[], error: error.message };
    return { rows: (rows ?? []) as CrashRow[] };
  });
