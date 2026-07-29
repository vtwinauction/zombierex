/**
 * Unified platform status — the single source of truth for feature flags
 * and maintenance mode across the app.
 *
 * Canonical store is `feature_flags_v2` (owner control centre). The legacy
 * `feature_flags` table is merged in as a fallback so older call sites keep
 * working: a module is OFF if either table disables it.
 *
 * All three tables are publicly readable (writes are owner-only via RLS),
 * so this runs on the browser client with no server round-trip.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ModuleKey =
  | "ai" | "judge" | "marketplace" | "garage" | "notifications" | "posting"
  | "registration" | "search" | "uploads" | "live" | "drag_racing"
  | "atlas" | "events" | "groups" | "messaging";

export type PlatformStatus = {
  flags: Record<string, boolean>;
  /** Per-module maintenance windows, keyed by module. */
  moduleMaintenance: Record<string, { enabled: boolean; message: string | null }>;
  global: { enabled: boolean; message: string | null; until: string | null };
};

export const EMPTY_STATUS: PlatformStatus = {
  flags: {},
  moduleMaintenance: {},
  global: { enabled: false, message: null, until: null },
};

export async function fetchPlatformStatus(): Promise<PlatformStatus> {
  const [v2, legacy, maint, modules] = await Promise.all([
    supabase.from("feature_flags_v2").select("key, enabled"),
    supabase.from("feature_flags").select("key, enabled"),
    supabase.from("maintenance_state").select("global_enabled, message, scheduled_until").eq("id", 1).maybeSingle(),
    supabase.from("module_maintenance").select("module_key, enabled, message"),
  ]);

  const flags: Record<string, boolean> = {};
  for (const row of v2.data ?? []) flags[row.key] = row.enabled !== false;
  for (const row of legacy.data ?? []) {
    // Legacy table can only turn something off, never back on.
    if (row.enabled === false) flags[row.key] = false;
    else if (!(row.key in flags)) flags[row.key] = true;
  }

  const moduleMaintenance: Record<string, { enabled: boolean; message: string | null }> = {};
  for (const row of modules.data ?? []) {
    moduleMaintenance[row.module_key] = { enabled: !!row.enabled, message: row.message ?? null };
  }

  return {
    flags,
    moduleMaintenance,
    global: {
      enabled: !!maint.data?.global_enabled,
      message: maint.data?.message ?? null,
      until: maint.data?.scheduled_until ?? null,
    },
  };
}

export function usePlatformStatus() {
  return useQuery({
    queryKey: ["platform", "status"],
    queryFn: fetchPlatformStatus,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    retry: 1,
    placeholderData: EMPTY_STATUS,
  });
}

/** Availability of one module: off when flagged off or under maintenance. */
export function useModule(key: ModuleKey | string) {
  const { data, isLoading } = usePlatformStatus();
  const status = data ?? EMPTY_STATUS;
  const flagOn = status.flags[key] !== false;
  const maint = status.moduleMaintenance[key];
  return {
    loading: isLoading,
    enabled: flagOn && !maint?.enabled && !status.global.enabled,
    flagOn,
    underMaintenance: !!maint?.enabled || status.global.enabled,
    message: maint?.message ?? status.global.message ?? null,
  };
}
