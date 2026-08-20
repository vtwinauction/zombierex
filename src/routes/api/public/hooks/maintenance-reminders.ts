/**
 * Scheduled maintenance reminders for the Digital Garage.
 *
 * Called by pg_cron (daily). Scans open service records with a due date or a
 * due odometer reading, and drops an in-app notification for anything that is
 * overdue or due soon. `reminded_at` keeps it to one reminder per record.
 *
 * Auth: dedicated CRON_SECRET header (routes under /api/public bypass edge auth).
 */
import { createFileRoute } from "@tanstack/react-router";
import { requireCronSecret } from "@/lib/cron-auth.server";
import { createClient } from "@supabase/supabase-js";
import { computeVehicleHealth } from "@/lib/vehicle-health";

const BATCH = 500;

export const Route = createFileRoute("/api/public/hooks/maintenance-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = requireCronSecret(request);
        if (denied) return denied;

        const admin = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } },
        );

        const { data: records, error } = await admin
          .from("vehicle_service_records")
          .select(
            "id, owner_id, vehicle_id, title, service_date, due_date, status, odometer_km, due_odometer_km",
          )
          .is("reminded_at", null)
          .neq("status", "done")
          .limit(BATCH);
        if (error) return new Response(`db: ${error.message}`, { status: 500 });
        if (!records?.length) return Response.json({ ok: true, sent: 0 });

        const vehicleIds = Array.from(new Set(records.map((r) => r.vehicle_id)));
        const { data: vehicles } = await admin
          .from("vehicles")
          .select("id, make, model, nickname, odometer_km, deleted_at")
          .in("id", vehicleIds);

        const byVehicle = new Map((vehicles ?? []).map((v) => [v.id, v]));

        const notes: Array<Record<string, unknown>> = [];
        const remindedIds: string[] = [];

        for (const vid of vehicleIds) {
          const vehicle = byVehicle.get(vid);
          if (!vehicle || vehicle.deleted_at) continue;
          const rows = records.filter((r) => r.vehicle_id === vid);
          const health = computeVehicleHealth(
            rows,
            vehicle.odometer_km == null ? null : Number(vehicle.odometer_km),
          );
          const label = vehicle.nickname || `${vehicle.make} ${vehicle.model}`;

          for (const item of health.items) {
            if (item.severity === "scheduled") continue;
            const record = rows.find((r) => r.id === item.id);
            if (!record) continue;
            remindedIds.push(record.id);
            const when =
              item.daysUntilDue !== null
                ? item.daysUntilDue < 0
                  ? `${Math.abs(item.daysUntilDue)} days overdue`
                  : `due in ${item.daysUntilDue} days`
                : item.kmUntilDue !== null && item.kmUntilDue < 0
                  ? `${Math.abs(item.kmUntilDue)} km overdue`
                  : `due in ${item.kmUntilDue} km`;
            notes.push({
              user_id: record.owner_id,
              kind: "system",
              payload: {
                title: item.severity === "overdue" ? "Maintenance overdue" : "Maintenance due soon",
                body: `${label}: ${item.title} — ${when}.`,
                url: `/garage/${vid}`,
                vehicle_id: vid,
                service_record_id: record.id,
              },
            });
          }
        }

        if (notes.length) {
          const { error: insErr } = await admin.from("notifications").insert(notes);
          if (insErr) return new Response(`notify: ${insErr.message}`, { status: 500 });
        }
        if (remindedIds.length) {
          await admin
            .from("vehicle_service_records")
            .update({ reminded_at: new Date().toISOString() })
            .in("id", remindedIds);
        }

        return Response.json({ ok: true, sent: notes.length, scanned: records.length });
      },
    },
  },
});
