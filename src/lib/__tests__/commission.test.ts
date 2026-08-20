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

const base: Omit<FeeRule, "id" | "label" | "scope"> & Partial<FeeRule> = {
  percent_bps: 1000,
  fixed_cents: 0,
  min_fee_cents: 0,
  max_fee_cents: null,
  is_active: true,
} as any;

function rule(p: Partial<FeeRule>): FeeRule {
  return { id: p.id ?? "r", label: p.label ?? "rule", ...(base as any), ...p } as FeeRule;
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

describe("resolveFeeRule", () => {
  it("prefers the more specific scope", () => {
    const rules = [
      rule({ id: "default", scope: "default" as any }),
      rule({ id: "seller", scope: "seller" as any, seller_id: "seller-1" } as any),
    ];
    expect(resolveFeeRule(rules, ctx)?.id).toBe("seller");
  });

  it("ignores rules outside their time window", () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const rules = [
      rule({ id: "default", scope: "default" as any }),
      rule({
        id: "promo",
        scope: "promo" as any,
        starts_at: past,
        ends_at: past,
      } as any),
    ];
    expect(resolveFeeRule(rules, ctx)?.id).toBe("default");
  });

  it("ignores rules for another currency", () => {
    const rules = [
      rule({ id: "default", scope: "default" as any }),
      rule({ id: "usd-only", scope: "seller" as any, seller_id: "seller-1", currency: "USD" } as any),
    ];
    expect(resolveFeeRule(rules, ctx)?.id).toBe("default");
  });

  it("is deterministic when nothing matches", () => {
    expect(resolveFeeRule([], ctx)).toBeNull();
    expect(computeSplit(1000, null).platform_fee_cents).toBe(0);
  });
});
