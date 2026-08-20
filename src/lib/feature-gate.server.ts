/**
 * Server-side feature-flag enforcement.
 *
 * The `usePlatform` hook hides UI when a module is off; that is cosmetic.
 * This module is the authoritative gate: every write path for a gated module
 * calls `assertModuleEnabled` so a disabled module (or a global maintenance
 * window / kill switch) cannot be driven straight from the RPC endpoint.
 *
 * Reads use the publishable key (all three tables are public-read, owner-write
 * via RLS) and are cached in-process for a few seconds so a kill switch takes
 * effect near-instantly without hammering the database on every request.
 */
import { createClient } from "@supabase/supabase-js";

export type ModuleState = "on" | "off" | "maintenance";

type Snapshot = {
  flags: Record<string, boolean>;
  moduleMaintenance: Record<string, { enabled: boolean; message: string | null }>;
  global: { enabled: boolean; message: string | null };
};

const TTL_MS = 5_000;
let cache: { at: number; value: Snapshot } | null = null;

function serverClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
          h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export async function platformSnapshot(): Promise<Snapshot> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const client = serverClient();
  const [v2, legacy, maint, modules] = await Promise.all([
    client.from("feature_flags_v2").select("key, enabled"),
    client.from("feature_flags").select("key, enabled"),
    client.from("maintenance_state").select("global_enabled, message").eq("id", 1).maybeSingle(),
    client.from("module_maintenance").select("module_key, enabled, message"),
  ]);

  const flags: Record<string, boolean> = {};
  for (const row of v2.data ?? []) flags[row.key] = row.enabled !== false;
  for (const row of legacy.data ?? []) {
    // The legacy table can only turn something off, never back on.
    if (row.enabled === false) flags[row.key] = false;
    else if (!(row.key in flags)) flags[row.key] = true;
  }

  const moduleMaintenance: Record<string, { enabled: boolean; message: string | null }> = {};
  for (const row of modules.data ?? []) {
    moduleMaintenance[row.module_key] = { enabled: !!row.enabled, message: row.message ?? null };
  }

  const value: Snapshot = {
    flags,
    moduleMaintenance,
    global: {
      enabled: !!maint.data?.global_enabled,
      message: maint.data?.message ?? null,
    },
  };
  cache = { at: Date.now(), value };
  return value;
}

/** Current state of one module, resolved server-side. */
export async function moduleState(key: string): Promise<{ state: ModuleState; message: string | null }> {
  let snap: Snapshot;
  try {
    snap = await platformSnapshot();
  } catch {
    // Fail open on infrastructure errors — a flag lookup outage must not take
    // the whole product down. Explicit "off" verdicts below still fail closed.
    return { state: "on", message: null };
  }
  if (snap.global.enabled) return { state: "maintenance", message: snap.global.message };
  const maint = snap.moduleMaintenance[key];
  if (maint?.enabled) return { state: "maintenance", message: maint.message };
  if (snap.flags[key] === false) return { state: "off", message: null };
  return { state: "on", message: null };
}

/**
 * Throw unless the module is fully available. Call at the top of every write
 * handler belonging to a gated module.
 */
export async function assertModuleEnabled(key: string, label?: string): Promise<void> {
  const { state, message } = await moduleState(key);
  if (state === "on") return;
  const name = label ?? key;
  throw new Error(
    state === "maintenance"
      ? (message ?? `${name} is temporarily under maintenance. Please try again shortly.`)
      : `${name} is currently disabled.`,
  );
}

/** Test/ops helper — drops the in-process cache so the next read is fresh. */
export function resetFeatureGateCache() {
  cache = null;
}
