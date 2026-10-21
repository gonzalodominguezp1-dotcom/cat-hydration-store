import { db } from "../db";

const PAID_STATES = ["PAID", "SUPPLIER_QUEUED", "SUPPLIER_ACCEPTED", "SUPPLIER_REJECTED", "SHIPPED", "DELIVERED", "REFUNDED"] as const;

/**
 * Sales metrics computed only from real orders in the database. Margin is an
 * ESTIMATE: it uses the supplier cost snapshot and the standard card fee, not
 * the actual fee reported by the PSP.
 */
export async function getSalesMetrics(since: Date) {
  const orders = await db.order.findMany({
    where: { status: { in: [...PAID_STATES] }, paidAt: { gte: since } },
    include: { items: true, refunds: { where: { status: "SUCCEEDED" } } },
  });
  let revenueGross = 0;
  let contribution = 0;
  let refunded = 0;
  for (const o of orders) {
    revenueGross += o.totalGrossCents;
    const net = o.totalGrossCents / (1 + o.vatRate);
    const cost = o.items.reduce((s, i) => s + (i.unitCostCents + i.unitShippingCents) * i.quantity, 0);
    const fee = o.totalGrossCents * 0.015 + 25;
    contribution += net - cost - fee;
    refunded += o.refunds.reduce((s, r) => s + r.amountCents, 0);
  }
  const pending = await db.order.count({ where: { status: { in: ["PAID", "SUPPLIER_QUEUED"] } } });
  const issues = await db.order.count({ where: { status: "SUPPLIER_REJECTED" } });
  return {
    orders: orders.length,
    revenueGross,
    aov: orders.length ? Math.round(revenueGross / orders.length) : 0,
    estimatedContribution: Math.round(contribution),
    contributionPerOrder: orders.length ? Math.round(contribution / orders.length) : 0,
    refunded,
    pending,
    issues,
  };
}
