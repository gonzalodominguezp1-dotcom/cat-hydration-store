import { Prisma } from "@prisma/client";
import { db } from "../db";
import { logger } from "../logger";
import { enqueueJob } from "../jobs/queue";
import { transitionOrder } from "../orders/transition";
import type { PaymentEvent } from "./types";

export type WebhookOutcome = "processed" | "duplicate" | "ignored" | "unknown_payment" | "amount_mismatch";

/**
 * Applies a VERIFIED payment event. The event id is stored in the same
 * transaction as its effects: if processing fails nothing is recorded and the
 * provider's retry will process it again; if it succeeds, retries are no-ops.
 *
 * This is the only place an order becomes PAID. Browser redirects never are.
 */
export async function handlePaymentEvent(provider: string, event: PaymentEvent): Promise<WebhookOutcome> {
  if (event.type === "ignored") return "ignored";
  try {
    return await db.$transaction(async (tx) => {
      await tx.webhookEvent.create({ data: { provider, eventId: event.id, type: event.rawType } });

      const payment = event.providerRef
        ? await tx.payment.findUnique({ where: { providerRef: event.providerRef } })
        : event.providerPaymentId
          ? await tx.payment.findFirst({ where: { providerPaymentId: event.providerPaymentId } })
          : null;

      if (!payment) {
        await tx.incident.create({
          data: { level: "warn", source: "webhook", message: `Evento ${event.rawType} sin pago asociado`, context: { eventId: event.id } },
        });
        return "unknown_payment" as const;
      }

      switch (event.type) {
        case "payment.succeeded": {
          if (event.amountCents !== payment.amountCents || (event.currency && event.currency.toLowerCase() !== "eur")) {
            await tx.incident.create({
              data: {
                level: "error",
                source: "webhook",
                message: `Importe cobrado (${event.amountCents}) distinto del esperado (${payment.amountCents}). Pedido NO marcado como pagado.`,
                context: { paymentId: payment.id, eventId: event.id },
              },
            });
            return "amount_mismatch" as const;
          }
          await tx.payment.update({
            where: { id: payment.id },
            data: { status: "SUCCEEDED", providerPaymentId: event.providerPaymentId },
          });
          const moved = await transitionOrder(
            payment.orderId,
            ["PENDING_PAYMENT", "PAYMENT_FAILED"],
            "PAID",
            `Pago confirmado por webhook ${event.id}`,
            tx,
            { paidAt: new Date() },
          );
          if (moved) {
            await enqueueJob("supplier.submit_order", { orderId: payment.orderId }, { dedupeKey: `submit:${payment.orderId}` }, tx);
          } else {
            const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId }, select: { status: true, number: true } });
            if (order.status === "CANCELLED" || order.status === "REFUNDED") {
              await tx.incident.create({
                data: {
                  level: "error",
                  source: "webhook",
                  message: `Pago recibido para el pedido ${order.number} en estado ${order.status}. Revisar y reembolsar.`,
                  context: { paymentId: payment.id, eventId: event.id },
                },
              });
            }
          }
          return "processed" as const;
        }
        case "payment.failed":
          await tx.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
          await transitionOrder(payment.orderId, "PENDING_PAYMENT", "PAYMENT_FAILED", `Pago fallido (${event.id})`, tx);
          return "processed" as const;
        case "payment.expired":
          await transitionOrder(payment.orderId, ["PENDING_PAYMENT", "PAYMENT_FAILED"], "CANCELLED", `Sesión de pago caducada (${event.id})`, tx);
          return "processed" as const;
        case "refund.succeeded": {
          const full = (event.amountCents ?? 0) >= payment.amountCents;
          await tx.payment.update({ where: { id: payment.id }, data: { status: full ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
          return "processed" as const;
        }
        default:
          return "ignored" as const;
      }
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      logger.info("webhook.duplicate", { provider, eventId: event.id });
      return "duplicate";
    }
    throw e;
  }
}
