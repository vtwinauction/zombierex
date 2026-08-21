/**
 * Shared taxonomy + helpers for the Garage/Workshop discovery & booking system.
 * Pure module — safe to import from routes, components and server functions.
 */

export const GARAGE_SPECIALTIES = [
  { code: "general_repair", label: "General repair" },
  { code: "maintenance", label: "Maintenance / service" },
  { code: "brand_specialist", label: "Brand specialist" },
  { code: "customization", label: "Customization" },
  { code: "tires", label: "Tires" },
  { code: "electrical", label: "Electrical" },
  { code: "engine", label: "Engine / mechanical" },
  { code: "bodywork", label: "Bodywork / paint" },
  { code: "detailing", label: "Detailing" },
  { code: "performance", label: "Performance / tuning" },
  { code: "emergency", label: "Emergency / roadside" },
] as const;

export type GarageSpecialty = (typeof GARAGE_SPECIALTIES)[number]["code"];

export const SPECIALTY_LABEL: Record<string, string> = Object.fromEntries(
  GARAGE_SPECIALTIES.map((s) => [s.code, s.label]),
);

export const GARAGE_VEHICLE_TYPES = [
  { code: "motorcycle", label: "Motorcycle" },
  { code: "car", label: "Car" },
  { code: "truck", label: "Truck" },
  { code: "scooter", label: "Scooter" },
  { code: "atv", label: "ATV" },
] as const;

export const PAYMENT_METHODS = ["cash", "card", "bank_transfer", "benefit", "apple_pay"] as const;

export const BOOKING_STATUSES = [
  "requested",
  "awaiting_garage",
  "quotation_sent",
  "awaiting_customer",
  "confirmed",
  "scheduled",
  "checked_in",
  "in_progress",
  "waiting_parts",
  "completed",
  "cancelled",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_STATUS_LABEL: Record<string, string> = {
  requested: "Pending",
  awaiting_garage: "Awaiting garage",
  quotation_sent: "Quotation sent",
  awaiting_customer: "Awaiting your approval",
  confirmed: "Confirmed",
  scheduled: "Scheduled",
  checked_in: "Vehicle checked in",
  in_progress: "Work in progress",
  waiting_parts: "Waiting for parts",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Statuses a garage may move a booking to, keyed by current status. */
export const VENDOR_NEXT_STATUS: Record<string, BookingStatus[]> = {
  requested: ["confirmed", "quotation_sent", "cancelled"],
  awaiting_garage: ["confirmed", "quotation_sent", "cancelled"],
  quotation_sent: ["confirmed", "cancelled"],
  awaiting_customer: ["confirmed", "cancelled"],
  confirmed: ["scheduled", "checked_in", "cancelled"],
  scheduled: ["checked_in", "cancelled"],
  checked_in: ["in_progress", "waiting_parts", "cancelled"],
  in_progress: ["waiting_parts", "completed", "cancelled"],
  waiting_parts: ["in_progress", "completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export const OPEN_BOOKING_STATUSES: BookingStatus[] = [
  "requested",
  "awaiting_garage",
  "quotation_sent",
  "awaiting_customer",
  "confirmed",
  "scheduled",
  "checked_in",
  "in_progress",
  "waiting_parts",
];

export const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export type DayWindow = { open: string; close: string; closed?: boolean };
export type Availability = {
  slot_minutes?: number;
  days?: Partial<Record<DayKey, DayWindow>>;
};

export const DEFAULT_AVAILABILITY: Required<Availability> = {
  slot_minutes: 60,
  days: {
    sun: { open: "08:00", close: "18:00" },
    mon: { open: "08:00", close: "18:00" },
    tue: { open: "08:00", close: "18:00" },
    wed: { open: "08:00", close: "18:00" },
    thu: { open: "08:00", close: "18:00" },
    fri: { open: "08:00", close: "18:00", closed: true },
    sat: { open: "08:00", close: "18:00" },
  },
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

/** Generate ISO-less "HH:MM" slots for a given YYYY-MM-DD date. */
export function slotsForDate(dateISO: string, availability: Availability | null): string[] {
  const av = { ...DEFAULT_AVAILABILITY, ...(availability ?? {}) };
  const days = { ...DEFAULT_AVAILABILITY.days, ...(availability?.days ?? {}) };
  const d = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(d.getTime())) return [];
  const key = DAY_KEYS[d.getDay()]!;
  const win = days[key];
  if (!win || win.closed) return [];
  const step = Math.min(Math.max(av.slot_minutes ?? 60, 15), 240);
  const start = toMinutes(win.open);
  const end = toMinutes(win.close);
  const out: string[] = [];
  for (let t = start; t + step <= end; t += step) out.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`);
  return out;
}

/** Is the garage open right now (viewer's local clock)? */
export function isOpenNow(availability: Availability | null, now = new Date()): boolean {
  const days = { ...DEFAULT_AVAILABILITY.days, ...(availability?.days ?? {}) };
  const win = days[DAY_KEYS[now.getDay()]!];
  if (!win || win.closed) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= toMinutes(win.open) && mins < toMinutes(win.close);
}

export function formatDistance(km: number | null | undefined): string {
  if (km == null || Number.isNaN(km)) return "—";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

/** Rough drive-time estimate at 38 km/h average urban speed. */
export function estimateDriveMinutes(km: number | null | undefined): number | null {
  if (km == null || Number.isNaN(km)) return null;
  return Math.max(2, Math.round((km / 38) * 60));
}

export function nextDates(count = 14, from = new Date()): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }
  return out;
}
