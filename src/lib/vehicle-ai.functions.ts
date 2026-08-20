/**
 * REX vehicle intelligence — build review + maintenance advice.
 * Thin server-fn wrapper; logic lives in `vehicle-health.ts` and the gateway.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeVehicleHealth } from "@/lib/vehicle-health";
import { aiCompleteJson } from "@/lib/ai-gateway.server";

const VehicleIdInput = z.object({ id: z.string().uuid() });

const REX_SYSTEM =
  "You are REX, ZOMBIEREX's automotive intelligence. You review vehicle builds and maintenance like a seasoned race mechanic: precise, honest, never flattering. Never invent parts the user did not list.";

export const getVehicleHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => VehicleIdInput.parse(raw))
  .handler(async ({ data, context }) => {
    const [records, vehicle] = await Promise.all([
      context.supabase
        .from("vehicle_service_records")
        .select("id, title, service_date, due_date, status, odometer_km, due_odometer_km")
        .eq("vehicle_id", data.id)
        .eq("owner_id", context.userId),
      context.supabase
        .from("vehicles")
        .select("odometer_km")
        .eq("id", data.id)
        .eq("owner_id", context.userId)
        .maybeSingle(),
    ]);
    if (records.error) throw new Error(records.error.message);
    const odo = vehicle.data?.odometer_km ?? null;
    return computeVehicleHealth(records.data ?? [], odo === null ? null : Number(odo));
  });

export const reviewBuild = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => VehicleIdInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { error: rlError } = await context.supabase.rpc("check_rate_limit", {
      _bucket: "ai_assist",
      _max_hits: 20,
      _window_seconds: 3600,
    });
    if (rlError)
      throw new Error(
        rlError.message.includes("rate_limit_exceeded")
          ? "AI usage limit reached — try again in a little while."
          : rlError.message,
      );

    const [vehicle, mods, service] = await Promise.all([
      context.supabase
        .from("vehicles")
        .select("kind, make, model, year, nickname, spec, odometer_km")
        .eq("id", data.id)
        .eq("owner_id", context.userId)
        .is("deleted_at", null)
        .maybeSingle(),
      context.supabase
        .from("vehicle_mods")
        .select("category, title, brand")
        .eq("vehicle_id", data.id),
      context.supabase
        .from("vehicle_service_records")
        .select("id, title, service_date, due_date, status, odometer_km, due_odometer_km")
        .eq("vehicle_id", data.id)
        .eq("owner_id", context.userId),
    ]);
    if (vehicle.error) throw new Error(vehicle.error.message);
    if (!vehicle.data) throw new Error("Vehicle not found");

    const v = vehicle.data;
    const health = computeVehicleHealth(
      service.data ?? [],
      v.odometer_km === null || v.odometer_km === undefined ? null : Number(v.odometer_km),
    );
    const modList = (mods.data ?? [])
      .map((m) => `- [${m.category}] ${m.title}${m.brand ? ` (${m.brand})` : ""}`)
      .join("\n");

    const out = await aiCompleteJson<{
      summary?: string;
      strengths?: string[];
      gaps?: string[];
      next_mods?: string[];
      maintenance?: string[];
    }>(
      [
        { role: "system", content: REX_SYSTEM },
        {
          role: "user",
          content: [
            `Vehicle: ${v.year ?? ""} ${v.make} ${v.model} (${v.kind}).`,
            health.currentOdometerKm !== null
              ? `Odometer: ${Math.round(health.currentOdometerKm).toLocaleString()} km.`
              : "Odometer: not tracked.",
            modList ? `Modifications:\n${modList}` : "Modifications: none logged.",
            `Maintenance health score: ${health.score}/100 (${health.grade}).`,
            health.items.length
              ? `Outstanding items: ${health.items
                  .map((i) => `${i.title} (${describeDue(i)})`)
                  .join(", ")}`
              : "No outstanding scheduled work.",
            health.daysSinceLastService === null
              ? "No service history logged."
              : `Last service was ${health.daysSinceLastService} days ago.`,
            `Return JSON: {"summary": string (max 320 chars), "strengths": string[0-3], "gaps": string[0-3], "next_mods": string[0-3], "maintenance": string[0-3]}. Each bullet max 110 chars.`,
          ].join("\n"),
        },
      ],
      { temperature: 0.5 },
    );

    return {
      summary: out.summary?.slice(0, 400) ?? "",
      strengths: (out.strengths ?? []).slice(0, 3),
      gaps: (out.gaps ?? []).slice(0, 3),
      nextMods: (out.next_mods ?? []).slice(0, 3),
      maintenance: (out.maintenance ?? []).slice(0, 3),
    };
  });

function describeDue(i: { daysUntilDue: number | null; kmUntilDue: number | null }): string {
  const parts: string[] = [];
  if (i.daysUntilDue !== null)
    parts.push(i.daysUntilDue < 0 ? `${-i.daysUntilDue}d overdue` : `in ${i.daysUntilDue}d`);
  if (i.kmUntilDue !== null)
    parts.push(i.kmUntilDue < 0 ? `${-i.kmUntilDue}km overdue` : `in ${i.kmUntilDue}km`);
  return parts.join(" / ") || "scheduled";
}
