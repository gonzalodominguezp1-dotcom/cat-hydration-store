/**
 * Decision rules for paid-acquisition tests. Orders per euro spent are
 * modelled as a Poisson process, so the CAC estimate carries a confidence
 * interval that is wide when there are few orders. Rules act on the interval,
 * not on the point estimate, to avoid scaling or killing a test on noise.
 *
 * No rule ever increases spend automatically: "scale_candidate" only flags
 * that a human may approve a budget increase.
 */

export type TestDecision =
  | "keep_collecting"
  | "stop"
  | "optimize"
  | "scale_candidate"
  | "abandon_product";

export interface AdTestInput {
  spend: number;
  orders: number;
  /** Maximum CAC that breaks even on the first order (from unit economics). */
  breakevenCac: number;
  /** Total budget approved for this product test. */
  approvedTestBudget: number;
  /** z-score for the interval; 1.645 ≈ 90 % two-sided. */
  z?: number;
}

export interface AdTestEvaluation {
  decision: TestDecision;
  cacPoint: number | null;
  /** Best plausible CAC (spend / upper bound of orders). */
  cacOptimistic: number;
  /** Worst plausible CAC (spend / lower bound of orders); Infinity with 0 orders. */
  cacPessimistic: number;
  requiresHumanApproval: boolean;
  reason: string;
}

/** Byar's approximation to the exact Poisson confidence interval. */
export function poissonInterval(k: number, z: number): { lower: number; upper: number } {
  if (k < 0 || !Number.isInteger(k)) throw new Error("k must be a non-negative integer");
  const lower = k === 0 ? 0 : k * Math.pow(1 - 1 / (9 * k) - z / (3 * Math.sqrt(k)), 3);
  const k1 = k + 1;
  const upper = k1 * Math.pow(1 - 1 / (9 * k1) + z / (3 * Math.sqrt(k1)), 3);
  return { lower: Math.max(0, lower), upper };
}

export const MIN_ORDERS_TO_SCALE = 10;
/** Spend at least this many break-even CACs before judging a test. */
export const MIN_SPEND_MULTIPLE = 3;

export function evaluateAdTest(input: AdTestInput): AdTestEvaluation {
  const z = input.z ?? 1.645;
  const { spend, orders, breakevenCac, approvedTestBudget } = input;
  if (breakevenCac <= 0) {
    return {
      decision: "stop",
      cacPoint: orders > 0 ? spend / orders : null,
      cacOptimistic: Infinity,
      cacPessimistic: Infinity,
      requiresHumanApproval: false,
      reason: "La contribución antes de publicidad es ≤ 0: ningún CAC es rentable. Revisar precio o costes.",
    };
  }

  const { lower, upper } = poissonInterval(orders, z);
  const cacOptimistic = spend / upper;
  const cacPessimistic = lower > 0 ? spend / lower : Infinity;
  const cacPoint = orders > 0 ? spend / orders : null;
  const base = { cacPoint, cacOptimistic, cacPessimistic };

  if (cacOptimistic > breakevenCac) {
    return {
      ...base,
      decision: spend >= approvedTestBudget ? "abandon_product" : "stop",
      requiresHumanApproval: false,
      reason: "Incluso en el escenario optimista del intervalo, el CAC supera el CAC de equilibrio.",
    };
  }

  if (cacPessimistic < breakevenCac && orders >= MIN_ORDERS_TO_SCALE) {
    return {
      ...base,
      decision: "scale_candidate",
      requiresHumanApproval: true,
      reason: "Incluso en el escenario pesimista el CAC queda por debajo del equilibrio. Aumentar presupuesto requiere aprobación manual.",
    };
  }

  if (spend >= approvedTestBudget) {
    return {
      ...base,
      decision: "abandon_product",
      requiresHumanApproval: false,
      reason: "Presupuesto de prueba agotado sin evidencia suficiente de rentabilidad.",
    };
  }

  if (spend < MIN_SPEND_MULTIPLE * breakevenCac) {
    return {
      ...base,
      decision: "keep_collecting",
      requiresHumanApproval: false,
      reason: `Muestra insuficiente: gastar al menos ${MIN_SPEND_MULTIPLE}× el CAC de equilibrio antes de decidir.`,
    };
  }

  return {
    ...base,
    decision: "optimize",
    requiresHumanApproval: false,
    reason: "Resultado ambiguo: el intervalo de CAC incluye el equilibrio. Optimizar creatividades, oferta o landing.",
  };
}
