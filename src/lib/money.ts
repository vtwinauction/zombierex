/**
 * The single money-formatting barrel for the whole app.
 *
 * Never divide a stored integer amount by 100 in a component — BHD/KWD/OMR are
 * 1/1000 currencies and JPY is 1/1, so `/100` is a factor-of-10 (or 100) error.
 * Always import `formatMoney` (display), `toDecimal` (numbers for charts and
 * inputs) or `toMinorUnits` (writes) from here.
 */
export { formatMoney, minorUnits, toMinorUnits } from "@/lib/commission";

import { minorUnits as _minorUnits } from "@/lib/commission";

/** App default currency (Bahrain-first launch). */
export const DEFAULT_CURRENCY = "BHD";

/**
 * Integer minor units -> decimal number, currency-aware.
 * Use for chart axes and numeric <input value>, never for display strings.
 */
export function toDecimal(minor: number, currency: string = DEFAULT_CURRENCY): number {
  return (minor ?? 0) / _minorUnits(currency);
}

/** The `step` a numeric money input needs so 1/1000 currencies stay enterable. */
export function inputStep(currency: string = DEFAULT_CURRENCY): string {
  const u = _minorUnits(currency);
  return u === 1000 ? "0.001" : u === 1 ? "1" : "0.01";
}

/** Decimal places a currency renders with. */
export function decimalPlaces(currency: string = DEFAULT_CURRENCY): number {
  const u = _minorUnits(currency);
  return u === 1000 ? 3 : u === 1 ? 0 : 2;
}

/** Minor units -> fixed-decimal string suitable for prefilling an input. */
export function toDecimalString(minor: number, currency: string = DEFAULT_CURRENCY): string {
  return toDecimal(minor, currency).toFixed(decimalPlaces(currency));
}
