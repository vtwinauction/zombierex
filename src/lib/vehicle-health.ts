/**
 * Deterministic maintenance intelligence for the Digital Garage.
 * Pure functions — no server or browser dependencies, so both the vehicle
 * page and server functions can share the exact same scoring.
 */

export type ServiceLike = {
  id: string;
  title: string;
  service_date: string | null;
  due_date: string | null;
  status: string | null;
  odometer_km: number | null;
  due_odometer_km?: number | null;
};

export type HealthItem = {
  id: string;
  title: string;
  /** Days until due — negative when overdue. Null when the item is distance-only. */
  daysUntilDue: number | null;
  /** Kilometres until due — negative when overdue. Null when the item is date-only. */
  kmUntilDue: number | null;
  severity: "overdue" | "due-soon" | "scheduled";
  dueDate: string | null;
  dueOdometerKm: number | null;
};

export type VehicleHealth = {
  /** 0-100; 100 = nothing outstanding and history is fresh. */
  score: number;
  grade: "excellent" | "good" | "attention" | "critical";
  items: HealthItem[];
  lastServiceDate: string | null;
  lastOdometerKm: number | null;
  daysSinceLastService: number | null;
  /** Current vehicle odometer used for distance-based scoring. */
  currentOdometerKm: number | null;
};

const DAY = 86_400_000;

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY);
}

/** Distance window (km) that counts as "due soon". */
const KM_SOON = 500;

export function computeVehicleHealth(
  records: ServiceLike[],
  currentOdometerKm: number | null = null,
  now: Date = new Date(),
): VehicleHealth {
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  const odo = typeof currentOdometerKm === "number" && currentOdometerKm >= 0 ? currentOdometerKm : null;

  const items: HealthItem[] = [];
  for (const r of records) {
    const due = toDate(r.due_date);
    const dueKm = typeof r.due_odometer_km === "number" ? r.due_odometer_km : null;
    if (!due && dueKm === null) continue;
    if (r.status === "done" && !isUpcoming(r)) continue;

    const daysUntilDue = due ? daysBetween(today, due) : null;
    const kmUntilDue = dueKm !== null && odo !== null ? dueKm - odo : null;

    const bySeverity = (): HealthItem["severity"] => {
      if ((daysUntilDue !== null && daysUntilDue < 0) || (kmUntilDue !== null && kmUntilDue < 0))
        return "overdue";
      if (
        (daysUntilDue !== null && daysUntilDue <= 30) ||
        (kmUntilDue !== null && kmUntilDue <= KM_SOON)
      )
        return "due-soon";
      return "scheduled";
    };

    items.push({
      id: r.id,
      title: r.title,
      daysUntilDue,
      kmUntilDue,
      dueDate: r.due_date ? r.due_date.slice(0, 10) : null,
      dueOdometerKm: dueKm,
      severity: bySeverity(),
    });
  }

  const rank = { overdue: 0, "due-soon": 1, scheduled: 2 } as const;
  items.sort(
    (a, b) =>
      rank[a.severity] - rank[b.severity] ||
      (a.daysUntilDue ?? Number.MAX_SAFE_INTEGER) - (b.daysUntilDue ?? Number.MAX_SAFE_INTEGER),
  );

  const done = records
    .filter((r) => r.status !== "upcoming" && toDate(r.service_date))
    .sort(
      (a, b) => toDate(b.service_date)!.getTime() - toDate(a.service_date)!.getTime(),
    );
  const last = done[0] ?? null;
  const lastDate = last ? toDate(last.service_date) : null;
  const daysSinceLastService = lastDate ? daysBetween(lastDate, today) : null;

  let score = 100;
  for (const it of items) {
    if (it.severity === "overdue") {
      const monthsLate = it.daysUntilDue !== null && it.daysUntilDue < 0 ? Math.floor(-it.daysUntilDue / 30) : 0;
      const kmLate = it.kmUntilDue !== null && it.kmUntilDue < 0 ? Math.floor(-it.kmUntilDue / 1000) : 0;
      score -= Math.min(40, 15 + Math.max(monthsLate, kmLate) * 5);
    } else if (it.severity === "due-soon") score -= 8;
  }
  if (daysSinceLastService === null) score -= 15;
  else if (daysSinceLastService > 365) score -= 20;
  else if (daysSinceLastService > 180) score -= 8;

  score = Math.max(0, Math.min(100, score));
  const grade: VehicleHealth["grade"] =
    score >= 85 ? "excellent" : score >= 65 ? "good" : score >= 40 ? "attention" : "critical";

  return {
    score,
    grade,
    items,
    lastServiceDate: last?.service_date?.slice(0, 10) ?? null,
    lastOdometerKm: last?.odometer_km ?? null,
    daysSinceLastService,
    currentOdometerKm: odo,
  };
}

function isUpcoming(r: ServiceLike): boolean {
  return r.status === "upcoming";
}
