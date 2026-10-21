import { describe, expect, it } from "vitest";
import { computeUnitEconomics } from "./unit-economics";
import { computeMonthlyModel } from "./monthly-model";
import { evaluateAdTest, poissonInterval } from "./decisions";
import { DEFAULT_SCENARIOS } from "./scenarios";

const fountainEs = {
  priceGross: 39.9,
  vatRate: 0.21,
  productCost: 13,
  shippingCost: 6,
  paymentFeePct: 0.015,
  paymentFeeFixed: 0.25,
  returnsProvisionPct: 0.05,
  otherVariableCost: 0.5,
  cac: 0,
};

describe("computeUnitEconomics", () => {
  it("matches the hand calculation in MARKET_RESEARCH.md", () => {
    const r = computeUnitEconomics(fountainEs);
    expect(r.priceNet).toBe(32.98);
    expect(r.paymentFee).toBe(0.85);
    expect(r.returnsProvision).toBe(1.65);
    expect(r.contributionBeforeAds).toBe(10.98);
    expect(r.breakevenCac).toBe(10.98);
    expect(r.breakevenRoasGross).toBeCloseTo(3.63, 2);
  });

  it("subtracts CAC to get profit per order", () => {
    const r = computeUnitEconomics({ ...fountainEs, cac: 20 });
    expect(r.profitPerOrder).toBe(-9.02);
  });

  it("returns Infinity break-even ROAS when contribution is negative", () => {
    const r = computeUnitEconomics({ ...fountainEs, productCost: 40 });
    expect(r.contributionBeforeAds).toBeLessThan(0);
    expect(r.breakevenRoasGross).toBe(Infinity);
    expect(r.breakevenCac).toBe(0);
  });

  it("rejects invalid input", () => {
    expect(() => computeUnitEconomics({ ...fountainEs, priceGross: -1 })).toThrow();
    expect(() => computeUnitEconomics({ ...fountainEs, vatRate: 21 })).toThrow();
  });

  it("a high ROAS is not automatically profitable", () => {
    // ROAS 3 looks good but is below the ~3.6 break-even of a single fountain.
    const r = computeUnitEconomics({ ...fountainEs, cac: 39.9 / 3 });
    expect(r.profitPerOrder).toBeLessThan(0);
  });
});

describe("computeMonthlyModel", () => {
  it("computes break-even orders and operating profit", () => {
    const r = computeMonthlyModel(DEFAULT_SCENARIOS.base);
    expect(r.unit.profitPerOrder).toBeGreaterThan(0);
    expect(r.breakevenOrders).toBe(Math.ceil(250 / r.unit.profitPerOrder));
    expect(r.adSpend).toBe(80 * 15);
    expect(r.operatingProfit).toBeCloseTo(80 * r.unit.profitPerOrder + 10 * 6 - 250, 1);
  });

  it("orders scenarios from worst to best", () => {
    const c = computeMonthlyModel(DEFAULT_SCENARIOS.conservative).operatingProfit;
    const b = computeMonthlyModel(DEFAULT_SCENARIOS.base).operatingProfit;
    const o = computeMonthlyModel(DEFAULT_SCENARIOS.optimistic).operatingProfit;
    expect(c).toBeLessThan(b);
    expect(b).toBeLessThan(o);
  });

  it("paid-only CAC of the base bundle loses money per order", () => {
    const r = computeMonthlyModel({ ...DEFAULT_SCENARIOS.base, unit: { ...DEFAULT_SCENARIOS.base.unit, cac: 22 } });
    expect(r.unit.profitPerOrder).toBeLessThan(0);
    expect(r.breakevenOrders).toBe(Infinity);
  });

  it("conservative scenario loses money (it is meant to be a warning)", () => {
    expect(computeMonthlyModel(DEFAULT_SCENARIOS.conservative).operatingProfit).toBeLessThan(0);
  });
});

describe("poissonInterval", () => {
  it("brackets the observed count", () => {
    for (const k of [1, 5, 20, 100]) {
      const { lower, upper } = poissonInterval(k, 1.645);
      expect(lower).toBeLessThan(k);
      expect(upper).toBeGreaterThan(k);
    }
  });

  it("is close to the exact 90% interval for k=10 (5.43, 16.96)", () => {
    const { lower, upper } = poissonInterval(10, 1.645);
    expect(lower).toBeCloseTo(5.43, 1);
    expect(upper).toBeCloseTo(16.96, 1);
  });

  it("has zero lower bound when no orders", () => {
    expect(poissonInterval(0, 1.645).lower).toBe(0);
  });
});

describe("evaluateAdTest", () => {
  const base = { breakevenCac: 18, approvedTestBudget: 500 };

  it("keeps collecting with a small sample", () => {
    expect(evaluateAdTest({ ...base, spend: 30, orders: 1 }).decision).toBe("keep_collecting");
  });

  it("stops when even the optimistic CAC is above break-even", () => {
    const r = evaluateAdTest({ ...base, spend: 200, orders: 2 });
    expect(r.decision).toBe("stop");
  });

  it("stops with zero orders once spend is clearly too high", () => {
    expect(evaluateAdTest({ ...base, spend: 120, orders: 0 }).decision).toBe("stop");
  });

  it("does not scale on few orders even with a great point CAC", () => {
    const r = evaluateAdTest({ ...base, spend: 40, orders: 4 });
    expect(r.decision).not.toBe("scale_candidate");
  });

  it("flags scale candidates but requires human approval", () => {
    const r = evaluateAdTest({ ...base, spend: 300, orders: 40 });
    expect(r.decision).toBe("scale_candidate");
    expect(r.requiresHumanApproval).toBe(true);
  });

  it("asks to optimize when the interval straddles break-even", () => {
    expect(evaluateAdTest({ ...base, spend: 200, orders: 11 }).decision).toBe("optimize");
  });

  it("abandons when budget is spent without proof", () => {
    expect(evaluateAdTest({ ...base, spend: 500, orders: 27 }).decision).toBe("abandon_product");
  });

  it("stops immediately if unit economics are negative", () => {
    expect(evaluateAdTest({ ...base, breakevenCac: 0, spend: 10, orders: 1 }).decision).toBe("stop");
  });
});
