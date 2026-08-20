import { describe, expect, it } from "vitest";
import { computeVehicleHealth, type ServiceLike } from "@/lib/vehicle-health";

const NOW = new Date("2026-01-01T00:00:00Z");

function rec(p: Partial<ServiceLike>): ServiceLike {
  return {
    id: p.id ?? "r1",
    title: p.title ?? "Oil change",
    service_date: p.service_date ?? "2025-12-01",
    due_date: p.due_date ?? null,
    status: p.status ?? "done",
    odometer_km: p.odometer_km ?? null,
    due_odometer_km: p.due_odometer_km ?? null,
  };
}

describe("computeVehicleHealth", () => {
  it("scores a fresh vehicle with nothing outstanding", () => {
    const h = computeVehicleHealth([rec({})], 1000, NOW);
    expect(h.items).toHaveLength(0);
    expect(h.score).toBe(100);
    expect(h.grade).toBe("excellent");
    expect(h.currentOdometerKm).toBe(1000);
  });

  it("penalises a date-overdue item", () => {
    const h = computeVehicleHealth(
      [rec({ status: "upcoming", due_date: "2025-11-01", service_date: null })],
      null,
      NOW,
    );
    expect(h.items[0]?.severity).toBe("overdue");
    expect(h.items[0]?.daysUntilDue).toBeLessThan(0);
    expect(h.score).toBeLessThan(80);
  });

  it("flags mileage-overdue work using the live odometer", () => {
    const h = computeVehicleHealth(
      [rec({ status: "upcoming", service_date: null, due_odometer_km: 10_000 })],
      12_500,
      NOW,
    );
    expect(h.items[0]?.severity).toBe("overdue");
    expect(h.items[0]?.kmUntilDue).toBe(-2500);
    expect(h.items[0]?.daysUntilDue).toBeNull();
  });

  it("treats work inside the 500 km window as due soon", () => {
    const h = computeVehicleHealth(
      [rec({ status: "upcoming", service_date: null, due_odometer_km: 10_000 })],
      9800,
      NOW,
    );
    expect(h.items[0]?.severity).toBe("due-soon");
    expect(h.items[0]?.kmUntilDue).toBe(200);
  });

  it("ignores mileage due dates when the odometer is unknown", () => {
    const h = computeVehicleHealth(
      [rec({ status: "upcoming", service_date: null, due_odometer_km: 10_000 })],
      null,
      NOW,
    );
    expect(h.items[0]?.severity).toBe("scheduled");
    expect(h.items[0]?.kmUntilDue).toBeNull();
  });

  it("sorts overdue items ahead of scheduled ones", () => {
    const h = computeVehicleHealth(
      [
        rec({ id: "a", status: "upcoming", service_date: null, due_date: "2026-06-01" }),
        rec({ id: "b", status: "upcoming", service_date: null, due_date: "2025-10-01" }),
      ],
      null,
      NOW,
    );
    expect(h.items.map((i) => i.id)).toEqual(["b", "a"]);
  });
});
