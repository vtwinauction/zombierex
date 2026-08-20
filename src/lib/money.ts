/**
 * The single money-formatting barrel for the whole app.
 *
 * Never divide a stored integer amount by 100 in a component — BHD/KWD/OMR are
 * 1/1000 currencies and JPY is 1/1, so `/100` is a factor-of-10 (or 100) error.
 * Always import `formatMoney` from here.
 */
export { formatMoney, minorUnits, toMinorUnits } from "@/lib/commission";

/** App default currency (Bahrain-first launch). */
export const DEFAULT_CURRENCY = "BHD";
