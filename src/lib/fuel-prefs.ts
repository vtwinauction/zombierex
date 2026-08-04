/**
 * Client-side fuel range preferences persisted to localStorage.
 * Keeps the fuel-alert feature usable without a vehicles migration.
 */
const KEY = "zrex.fuel.prefs.v1";

export type FuelPrefs = {
  tankCapacityL: number; // full-tank size (L)
  economyKmPerL: number; // average consumption (km per L)
  currentPct: number; // 0–100
  warnKm: number; // alert threshold in remaining km
  preferredBrand: string; // e.g. "Shell" — optional filter
};

const DEFAULTS: FuelPrefs = {
  tankCapacityL: 17,
  economyKmPerL: 18,
  currentPct: 100,
  warnKm: 40,
  preferredBrand: "",
};

export function getFuelPrefs(): FuelPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) } as FuelPrefs;
  } catch {
    return DEFAULTS;
  }
}

export function setFuelPrefs(p: Partial<FuelPrefs>) {
  if (typeof window === "undefined") return;
  const next = { ...getFuelPrefs(), ...p };
  window.localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function remainingKm(p: FuelPrefs): number {
  const litres = (p.tankCapacityL * p.currentPct) / 100;
  return Math.max(0, Math.round(litres * p.economyKmPerL));
}
