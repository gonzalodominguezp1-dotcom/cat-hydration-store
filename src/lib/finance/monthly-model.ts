import { z } from "zod";
import { computeUnitEconomics, unitEconomicsInputSchema, type UnitEconomicsResult } from "./unit-economics";

export const monthlyModelInputSchema = z.object({
  unit: unitEconomicsInputSchema,
  ordersPerMonth: z.number().int().min(0),
  /** Share of orders that come back to buy again within the month (e.g. filters). */
  repeatOrdersPerMonth: z.number().int().min(0).default(0),
  /** Contribution of a repeat order (no CAC, usually lower ticket). */
  repeatContribution: z.number().default(0),
  fixedCostsMonthly: z.number().min(0),
  /** Days between paying the supplier and receiving the payout from the PSP. */
  cashGapDays: z.number().int().min(0).max(90),
});

export type MonthlyModelInput = z.input<typeof monthlyModelInputSchema>;

export interface MonthlyModelResult {
  unit: UnitEconomicsResult;
  revenueGross: number;
  revenueNet: number;
  adSpend: number;
  contributionAfterAds: number;
  operatingProfit: number;
  /** Paid orders needed per month to cover fixed costs (Infinity if profit per order <= 0). */
  breakevenOrders: number;
  /** Cash tied up in supplier payments + ad spend during the PSP payout gap. */
  workingCapitalNeed: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeMonthlyModel(raw: MonthlyModelInput): MonthlyModelResult {
  const input = monthlyModelInputSchema.parse(raw);
  const unit = computeUnitEconomics(input.unit);
  const n = input.ordersPerMonth;

  const revenueGross = n * input.unit.priceGross;
  const revenueNet = n * unit.priceNet;
  const adSpend = n * input.unit.cac;
  const contributionAfterAds = n * unit.profitPerOrder + input.repeatOrdersPerMonth * input.repeatContribution;
  const operatingProfit = contributionAfterAds - input.fixedCostsMonthly;

  const dailyOutflow = (n * (input.unit.productCost + input.unit.shippingCost) + adSpend) / 30;
  const workingCapitalNeed = dailyOutflow * input.cashGapDays;

  return {
    unit,
    revenueGross: round2(revenueGross),
    revenueNet: round2(revenueNet),
    adSpend: round2(adSpend),
    contributionAfterAds: round2(contributionAfterAds),
    operatingProfit: round2(operatingProfit),
    breakevenOrders:
      unit.profitPerOrder > 0 ? Math.ceil(input.fixedCostsMonthly / unit.profitPerOrder) : Infinity,
    workingCapitalNeed: round2(workingCapitalNeed),
  };
}
