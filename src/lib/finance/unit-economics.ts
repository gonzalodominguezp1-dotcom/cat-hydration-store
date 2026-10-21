import { z } from "zod";

/**
 * Unit economics for a single order. All money values are EUR with VAT
 * included only where the field name says "Gross". Percentages are fractions
 * (0.21 = 21 %).
 */
export const unitEconomicsInputSchema = z.object({
  priceGross: z.number().positive(),
  vatRate: z.number().min(0).max(0.3),
  productCost: z.number().min(0),
  shippingCost: z.number().min(0),
  paymentFeePct: z.number().min(0).max(0.1),
  paymentFeeFixed: z.number().min(0),
  /** Provision for returns and defects, as a fraction of net revenue. */
  returnsProvisionPct: z.number().min(0).max(1),
  otherVariableCost: z.number().min(0),
  /** Cost to acquire one paying customer (all paid media / orders). */
  cac: z.number().min(0),
});

export type UnitEconomicsInput = z.infer<typeof unitEconomicsInputSchema>;

export interface UnitEconomicsResult {
  priceNet: number;
  vat: number;
  paymentFee: number;
  returnsProvision: number;
  variableCosts: number;
  /** Net revenue minus variable costs, before marketing. */
  contributionBeforeAds: number;
  contributionMarginPct: number;
  /** Contribution after subtracting CAC: profit per order before fixed costs. */
  profitPerOrder: number;
  /** Maximum CAC that still breaks even on the first order. */
  breakevenCac: number;
  /** ROAS (gross revenue / ad spend) needed to break even. Infinity if contribution <= 0. */
  breakevenRoasGross: number;
  /** ROAS on net revenue (ex VAT) needed to break even. */
  breakevenRoasNet: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeUnitEconomics(raw: UnitEconomicsInput): UnitEconomicsResult {
  const input = unitEconomicsInputSchema.parse(raw);
  const priceNet = input.priceGross / (1 + input.vatRate);
  const vat = input.priceGross - priceNet;
  // Payment fees are charged on the amount the customer pays (gross).
  const paymentFee = input.priceGross * input.paymentFeePct + input.paymentFeeFixed;
  const returnsProvision = priceNet * input.returnsProvisionPct;
  const variableCosts =
    input.productCost + input.shippingCost + paymentFee + returnsProvision + input.otherVariableCost;
  const contributionBeforeAds = priceNet - variableCosts;
  const profitPerOrder = contributionBeforeAds - input.cac;
  const positive = contributionBeforeAds > 0;

  return {
    priceNet: round2(priceNet),
    vat: round2(vat),
    paymentFee: round2(paymentFee),
    returnsProvision: round2(returnsProvision),
    variableCosts: round2(variableCosts),
    contributionBeforeAds: round2(contributionBeforeAds),
    contributionMarginPct: round2((contributionBeforeAds / priceNet) * 100),
    profitPerOrder: round2(profitPerOrder),
    breakevenCac: round2(Math.max(0, contributionBeforeAds)),
    breakevenRoasGross: positive ? round2(input.priceGross / contributionBeforeAds) : Infinity,
    breakevenRoasNet: positive ? round2(priceNet / contributionBeforeAds) : Infinity,
  };
}
