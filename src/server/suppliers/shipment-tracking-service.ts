import type { Prisma } from "@prisma/client";
import { db } from "../db";
import { enqueueJob } from "../jobs/queue";
import { transitionOrder } from "../orders/transition";
import { getSupplierAdapter } from "./registry";

const POLL_INTERVAL_MS = 6 * 3600_000;
const MAX_TRACKING_AGE_MS = 30 * 24 * 3600_000;

/**
 * Pulls tracking from the supplier. The order is only marked SHIPPED when the
 * supplier returns a tracking number, and DELIVERED only when the supplier
 * reports delivery: we never infer either.
 */
export async function pollTracking(orderId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { supplierOrders: { include: { supplier: true } } },
  });
  if (!order || !["SUPPLIER_ACCEPTED", "SHIPPED"].includes(order.status)) return;

  let anyShipped = false;
  let allDelivered = order.supplierOrders.length > 0;

  for (const so of order.supplierOrders) {
    if (!so.externalId) {
      allDelivered = false;
      continue;
    }
    const info = await getSupplierAdapter(so.supplier.adapterKey).getTracking(so.externalId);
    const hasEvidence = Boolean(info.trackingNumber && info.carrier);
    if (hasEvidence && info.status !== "pending") {
      anyShipped = true;
      await db.shipment.upsert({
        where: { carrier_trackingNumber: { carrier: info.carrier!, trackingNumber: info.trackingNumber! } },
        create: {
          orderId,
          carrier: info.carrier!,
          trackingNumber: info.trackingNumber!,
          trackingUrl: info.trackingUrl,
          status: info.status,
          events: info.events as unknown as Prisma.InputJsonValue,
        },
        update: { status: info.status, events: info.events as unknown as Prisma.InputJsonValue },
      });
      if (so.status === "ACCEPTED") {
        await db.supplierOrder.update({ where: { id: so.id }, data: { status: "SHIPPED" } });
      }
    }
    if (!(hasEvidence && info.status === "delivered")) allDelivered = false;
  }

  if (anyShipped) await transitionOrder(orderId, "SUPPLIER_ACCEPTED", "SHIPPED", "Proveedor facilitó número de seguimiento");
  if (allDelivered) {
    await transitionOrder(orderId, "SHIPPED", "DELIVERED", "Transportista informó entrega");
    return;
  }

  if (Date.now() - order.createdAt.getTime() < MAX_TRACKING_AGE_MS) {
    await enqueueJob("supplier.poll_tracking", { orderId }, { runAt: new Date(Date.now() + POLL_INTERVAL_MS) });
  } else {
    await db.incident.create({
      data: { level: "warn", source: "tracking", message: `Pedido ${order.number} sin entrega confirmada tras 30 días`, context: { orderId } },
    });
  }
}
