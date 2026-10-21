import type { MonthlyModelInput } from "./monthly-model";

export type ScenarioKey = "conservative" | "base" | "optimistic";

/**
 * Default scenarios for the cat-fountain bundle in Spain. Supplier cost,
 * shipping, CAC and volumes are ESTIMATES pending real supplier quotes and a
 * paid test. They are editable from the admin panel and must not be shown as
 * real results.
 */
export const DEFAULT_SCENARIOS: Record<ScenarioKey, MonthlyModelInput> = {
  conservative: {
    unit: {
      priceGross: 49.9,
      vatRate: 0.21,
      productCost: 19,
      shippingCost: 7.5,
      paymentFeePct: 0.015,
      paymentFeeFixed: 0.25,
      returnsProvisionPct: 0.08,
      otherVariableCost: 0.75,
      cac: 35,
    },
    ordersPerMonth: 30,
    repeatOrdersPerMonth: 0,
    repeatContribution: 0,
    fixedCostsMonthly: 250,
    cashGapDays: 7,
  },
  base: {
    unit: {
      priceGross: 54.9,
      vatRate: 0.21,
      productCost: 17,
      shippingCost: 6.5,
      paymentFeePct: 0.015,
      paymentFeeFixed: 0.25,
      returnsProvisionPct: 0.05,
      otherVariableCost: 0.5,
      // Blended CAC: assumes part of the orders come from organic/SEO.
      cac: 15,
    },
    ordersPerMonth: 80,
    repeatOrdersPerMonth: 10,
    repeatContribution: 6,
    fixedCostsMonthly: 250,
    cashGapDays: 7,
  },
  optimistic: {
    unit: {
      priceGross: 59.9,
      vatRate: 0.21,
      productCost: 15,
      shippingCost: 5.5,
      paymentFeePct: 0.015,
      paymentFeeFixed: 0.25,
      returnsProvisionPct: 0.04,
      otherVariableCost: 0.5,
      cac: 12,
    },
    ordersPerMonth: 200,
    repeatOrdersPerMonth: 40,
    repeatContribution: 7,
    fixedCostsMonthly: 400,
    cashGapDays: 7,
  },
};
