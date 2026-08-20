import { describe, expect, it } from "vitest";
import {
  computeSplit,
  formatMoney,
  minorUnits,
  resolveFeeRule,
  toMinorUnits,
  type FeeRule,
  type SplitContext,
} from "@/lib/commission";

function rule(p: Partial<FeeRule>): FeeRule {
  return {
    id: "r",
    label: "rule",
    kind: "order",
    scope: "default",
    scope_value: null,
    percent_bps: 1000,
    fixed_cents: 0,
    min_fee_cents: 0,
    max_fee_cents: null,
    currency: null,
    priority: 0,
    starts_at: null,
    ends_at: null,
    is_active: true,
    ...p,
  };
}

const ctx: SplitContext = {
  kind: "order",
  category: "parts",
  sellerId: "seller-1",
  sellerType: "pro",
  country: "BH",
  currency: "BHD",
};

describe("minorUnits / formatMoney", () => {
  it("knows BHD is a 1/1000 currency", () => {
    expect(minorUnits("BHD")).toBe(1000);
    expect(minorUnits("bhd")).toBe(1000);
    expect(minorUnits("JPY")).toBe(1);
    expect(minorUnits("ZZZ")).toBe(100);
  });

  it("formats BHD 12500 fils as 12.500, never $125.00", () => {
    const out = formatMoney(12_500, "BHD");
    expect(out).toContain("12.500");
    expect(out).not.toContain("125.00");
  });

  it("formats USD and JPY correctly", () => {
    expect(formatMoney(12_500, "USD")).toContain("125.00");
    expect(formatMoney(1250, "JPY")).toContain("1,250");
  });

  it("round-trips decimal input to minor units", () => {
    expect(toMinorUnits(12.5, "BHD")).toBe(12_500);
    expect(toMinorUnits(12.5, "USD")).toBe(1250);
  });
});

describe("computeSplit", () => {
  it("applies percent + fixed", () => {
    const s = computeSplit(10_000, rule({ percent_bps: 1000, fixed_cents: 100 }));
    expect(s.platform_fee_cents).toBe(1100);
    expect(s.net_cents).toBe(8900);
  });

  it("clamps to min and max", () => {
    expect(computeSplit(100, rule({ percent_bps: 100, min_fee_cents: 50 })).platform_fee_cents).toBe(
      50,
    );
    expect(
      computeSplit(100_000, rule({ percent_bps: 5000, max_fee_cents: 1000 })).platform_fee_cents,
    ).toBe(1000);
  });

  it("never lets the fee exceed gross or go negative", () => {
    const s = computeSplit(500, rule({ percent_bps: 20_000 }));
    expect(s.platform_fee_cents).toBeLessThanOrEqual(500);
    expect(s.net_cents).toBeGreaterThanOrEqual(0);
    expect(computeSplit(0, rule({ percent_bps: 1000 })).platform_fee_cents).toBe(0);
  });
});

describe("computeSplit invariants", () => {
  it("fee + net always equals gross, and the fee is always an integer", () => {
    for (const gross of [1, 7, 33, 99, 101, 999, 12_345, 1_000_003]) {
      for (const bps of [1, 250, 999, 1000, 3333, 9999]) {
        const s = computeSplit(gross, rule({ percent_bps: bps }));
        expect(s.platform_fee_cents + s.net_cents).toBe(s.gross_cents);
        expect(Number.isInteger(s.platform_fee_cents)).toBe(true);
      }
    }
  });

  it("splits several partial refund clawbacks to exactly the full fee", () => {
    // Mirrors refundTransaction: each clawback targets the pro-rata share of
    // the fee minus what was already returned, so the sum can never drift.
    const s = computeSplit(10_003, rule({ percent_bps: 1234 }));
    const slices = [3_000, 3_000, 4_003];
    let already = 0;
    let refunded = 0;
    for (const amount of slices) {
      refunded += amount;
      const target =
        refunded >= s.gross_cents
          ? s.platform_fee_cents
          : Math.round((s.platform_fee_cents * refunded) / s.gross_cents);
      already += Math.max(0, Math.min(target - already, s.platform_fee_cents - already));
    }
    expect(already).toBe(s.platform_fee_cents);
  });
});

describe("resolveFeeRule", () => {
  it("resolves scope precedence promo > seller > category > seller_type > country > default", () => {
    const rules = [
      rule({ id: "default", scope: "default" }),
      rule({ id: "country", scope: "country", scope_value: "bh" }),
      rule({ id: "sellertype", scope: "seller_type", scope_value: "pro" }),
      rule({ id: "category", scope: "category", scope_value: "helmets" }),
      rule({ id: "seller", scope: "seller", scope_value: "seller-1" }),
      rule({ id: "promo", scope: "promo", scope_value: "*" }),
    ];
    const full: SplitContext = {
      kind: "order",
      country: "BH",
      sellerType: "pro",
      category: "helmets",
      sellerId: "seller-1",
    };
    // Peel one tier at a time — this is what makes the ORDERING load-bearing.
    expect(resolveFeeRule(rules, full)?.id).toBe("promo");
    expect(resolveFeeRule(rules.slice(0, 5), full)?.id).toBe("seller");
    expect(resolveFeeRule(rules.slice(0, 4), full)?.id).toBe("category");
    expect(resolveFeeRule(rules.slice(0, 3), full)?.id).toBe("sellertype");
    expect(resolveFeeRule(rules.slice(0, 2), full)?.id).toBe("country");
    expect(resolveFeeRule(rules.slice(0, 1), full)?.id).toBe("default");
  });

  it("prefers the more specific scope", () => {
    const rules = [
      rule({ id: "default" }),
      rule({ id: "seller", scope: "seller", scope_value: "seller-1" }),
    ];
    expect(resolveFeeRule(rules, ctx)?.id).toBe("seller");
  });

  it("ignores rules outside their time window", () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const rules = [
      rule({ id: "default" }),
      rule({ id: "promo", scope: "promo", starts_at: past, ends_at: past }),
    ];
    expect(resolveFeeRule(rules, ctx)?.id).toBe("default");
  });

  it("ignores rules for another currency", () => {
    const rules = [
      rule({ id: "default" }),
      rule({ id: "usd-only", scope: "seller", scope_value: "seller-1", currency: "USD" }),
    ];
    expect(resolveFeeRule(rules, ctx)?.id).toBe("default");
  });

  it("is deterministic when nothing matches", () => {
    expect(resolveFeeRule([], ctx)).toBeNull();
    expect(computeSplit(1000, null).platform_fee_cents).toBe(0);
  });
});
