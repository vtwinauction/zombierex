/**
 * Commission engine — pure math.
 *
 * Client-safe on purpose: the owner panel uses the exact same functions to
 * preview a split as the server uses to settle one, so what the admin sees is
 * what the ledger records. All money is integer cents; never floats.
 */

export type TxnKind = "order" | "tip" | "creator_subscription" | "plan" | "ad" | "other";
export type FeeScope = "default" | "category" | "seller" | "seller_type" | "country" | "promo";

export interface FeeRule {
  id: string;
  label: string;
  kind: TxnKind;
  scope: FeeScope;
  scope_value: string | null;
  percent_bps: number;
  fixed_cents: number;
  min_fee_cents: number;
  max_fee_cents: number | null;
  currency: string | null;
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

export interface SplitContext {
  kind: TxnKind;
  category?: string | null;
  sellerId?: string | null;
  sellerType?: string | null;
  country?: string | null;
  currency?: string | null;
  at?: Date;
}

export interface Split {
  gross_cents: number;
  platform_fee_cents: number;
  net_cents: number;
  fee_bps: number;
  rule_id: string | null;
  rule_label: string;
}

/** Higher wins. Promo beats everything, then seller, then the rest. */
const SCOPE_WEIGHT: Record<FeeScope, number> = {
  promo: 500,
  seller: 400,
  category: 300,
  seller_type: 200,
  country: 100,
  default: 0,
};

function withinWindow(rule: FeeRule, at: Date): boolean {
  if (rule.starts_at && new Date(rule.starts_at) > at) return false;
  if (rule.ends_at && new Date(rule.ends_at) < at) return false;
  return true;
}

function scopeMatches(rule: FeeRule, ctx: SplitContext): boolean {
  const v = (rule.scope_value ?? "").toLowerCase();
  switch (rule.scope) {
    case "default":
      return true;
    case "category":
      return !!ctx.category && ctx.category.toLowerCase() === v;
    case "seller":
      return !!ctx.sellerId && ctx.sellerId.toLowerCase() === v;
    case "seller_type":
      return !!ctx.sellerType && ctx.sellerType.toLowerCase() === v;
    case "country":
      return !!ctx.country && ctx.country.toLowerCase() === v;
    case "promo":
      // Promo rules apply platform-wide unless narrowed by a scope_value that
      // matches the category or seller.
      if (!rule.scope_value || v === "*") return true;
      return (
        (!!ctx.category && ctx.category.toLowerCase() === v) ||
        (!!ctx.sellerId && ctx.sellerId.toLowerCase() === v)
      );
    default:
      return false;
  }
}

/** Picks the single winning rule for a transaction context. */
export function resolveFeeRule(rules: FeeRule[], ctx: SplitContext): FeeRule | null {
  const at = ctx.at ?? new Date();
  const candidates = rules.filter(
    (r) =>
      r.is_active &&
      r.kind === ctx.kind &&
      withinWindow(r, at) &&
      (!r.currency || !ctx.currency || r.currency === ctx.currency) &&
      scopeMatches(r, ctx),
  );
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    const s = SCOPE_WEIGHT[b.scope] - SCOPE_WEIGHT[a.scope];
    if (s !== 0) return s;
    if (b.priority !== a.priority) return b.priority - a.priority;
    // Deterministic tiebreak: the rule that charges less wins (buyer/seller-friendly).
    return a.percent_bps + a.fixed_cents - (b.percent_bps + b.fixed_cents);
  });
  return candidates[0];
}

/** Applies a rule to a gross amount. Fee is clamped to [min, max] and never exceeds gross. */
export function computeSplit(grossCents: number, rule: FeeRule | null): Split {
  const gross = Math.max(0, Math.round(grossCents));
  if (!rule || gross === 0) {
    return {
      gross_cents: gross,
      platform_fee_cents: 0,
      net_cents: gross,
      fee_bps: 0,
      rule_id: rule?.id ?? null,
      rule_label: rule?.label ?? "No commission",
    };
  }

  let fee = Math.round((gross * rule.percent_bps) / 10_000) + rule.fixed_cents;
  if (fee < rule.min_fee_cents) fee = rule.min_fee_cents;
  if (rule.max_fee_cents != null && fee > rule.max_fee_cents) fee = rule.max_fee_cents;
  if (fee > gross) fee = gross;
  if (fee < 0) fee = 0;

  return {
    gross_cents: gross,
    platform_fee_cents: fee,
    net_cents: gross - fee,
    fee_bps: gross > 0 ? Math.round((fee / gross) * 10_000) : 0,
    rule_id: rule.id,
    rule_label: rule.label,
  };
}

/** Convenience: resolve + compute in one call. */
export function priceTransaction(grossCents: number, rules: FeeRule[], ctx: SplitContext): Split {
  return computeSplit(grossCents, resolveFeeRule(rules, ctx));
}

/**
 * Currencies whose smallest unit is not 1/100. Amounts are always stored as
 * integer minor units, so BHD/KWD/OMR (1/1000) and JPY (1/1) must not be
 * divided by 100 or the displayed figure is off by 10x-100x.
 */
const MINOR_UNITS: Record<string, number> = {
  BHD: 1000,
  KWD: 1000,
  OMR: 1000,
  JOD: 1000,
  TND: 1000,
  JPY: 1,
  KRW: 1,
  VND: 1,
  CLP: 1,
  ISK: 1,
};

/** Minor units per whole unit for a currency (default 100). */
export function minorUnits(currency = "USD"): number {
  return MINOR_UNITS[currency.toUpperCase()] ?? 100;
}

/** Convert a decimal amount typed by a user into integer minor units. */
export function toMinorUnits(amount: number, currency = "USD"): number {
  return Math.round(amount * minorUnits(currency));
}

export function formatMoney(cents: number, currency = "USD"): string {
  const code = currency.toUpperCase();
  const divisor = minorUnits(code);
  const digits = divisor === 1000 ? 3 : divisor === 1 ? 0 : 2;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(cents / divisor);
  } catch {
    return `${(cents / divisor).toFixed(digits)} ${code}`;
  }
}

export function describeRule(
  rule: Pick<FeeRule, "percent_bps" | "fixed_cents" | "min_fee_cents" | "max_fee_cents">,
): string {
  const parts: string[] = [];
  if (rule.percent_bps > 0) parts.push(`${(rule.percent_bps / 100).toFixed(2)}%`);
  if (rule.fixed_cents > 0) parts.push(`${formatMoney(rule.fixed_cents)}`);
  let s = parts.length ? parts.join(" + ") : "0%";
  if (rule.min_fee_cents > 0) s += ` · min ${formatMoney(rule.min_fee_cents)}`;
  if (rule.max_fee_cents != null) s += ` · max ${formatMoney(rule.max_fee_cents)}`;
  return s;
}
