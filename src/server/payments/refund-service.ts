import { db } from "../db";
import { getPaymentProvider } from "./registry";
import { transitionOrder } from "../orders/transition";

/** Issues a refund through the provider. Requires an admin action. */
export async function refundOrder(orderId: string, amountCents: number, reason: string) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { payments: true, refunds: true } });
  const payment = order.payments.find((p) => p.status === "SUCCEEDED" || p.status === "PARTIALLY_REFUNDED");
  if (!payment?.providerPaymentId) throw new Error("No hay un pago confirmado que reembolsar.");

  const alreadyRefunded = order.refunds.filter((r) => r.status !== "FAILED").reduce((s, r) => s + r.amountCents, 0);
  if (amountCents <= 0 || alreadyRefunded + amountCents > payment.amountCents) {
    throw new Error("El importe supera lo cobrado.");
  }

  const refund = await db.refund.create({ data: { orderId, amountCents, reason } });
  try {
    const res = await getPaymentProvider().refund(payment.providerPaymentId, amountCents, `refund:${refund.id}`);
    await db.refund.update({ where: { id: refund.id }, data: { status: "SUCCEEDED", providerRef: res.providerRef } });
  } catch (e) {
    await db.refund.update({ where: { id: refund.id }, data: { status: "FAILED" } });
    throw e;
  }
  if (alreadyRefunded + amountCents === payment.amountCents) {
    await transitionOrder(
      orderId,
      ["PAID", "SUPPLIER_REJECTED", "SHIPPED", "DELIVERED", "CANCELLED"],
      "REFUNDED",
      `Reembolso total: ${reason}`,
    ).catch(() => false);
  }
  return refund;
}
