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
};

export type HealthItem = {
  id: string;
  title: string;
  /** Days until due — negative when overdue. */
  daysUntilDue: number;
  severity: "overdue" | "due-soon" | "scheduled";
  dueDate: string;
};

export type VehicleHealth = {
  /** 0-100; 100 = nothing outstanding and history is fresh. */
  score: number;
  grade: "excellent" | "good" | "attention" | "critical";
  items: HealthItem[];
  lastServiceDate: string | null;
  lastOdometerKm: number | null;
  daysSinceLastService: number | null;
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

export function computeVehicleHealth(
  records: ServiceLike[],
  now: Date = new Date(),
): VehicleHealth {
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  const items: HealthItem[] = [];
  for (const r of records) {
    const due = toDate(r.due_date);
    if (!due) continue;
    if (r.status === "done" && !isUpcoming(r)) continue;
    const daysUntilDue = daysBetween(today, due);
    items.push({
      id: r.id,
      title: r.title,
      daysUntilDue,
      dueDate: r.due_date!.slice(0, 10),
      severity: daysUntilDue < 0 ? "overdue" : daysUntilDue <= 30 ? "due-soon" : "scheduled",
    });
  }
  items.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

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
    if (it.severity === "overdue") score -= Math.min(40, 15 + Math.floor(-it.daysUntilDue / 30) * 5);
    else if (it.severity === "due-soon") score -= 8;
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
  };
}

function isUpcoming(r: ServiceLike): boolean {
  return r.status === "upcoming";
}
