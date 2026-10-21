import { db } from "../db";
import { env } from "../env";
import { logger } from "../logger";
import { enqueueJob } from "../jobs/queue";
import { transitionOrder } from "../orders/transition";
import { getSupplierAdapter } from "./registry";
import type { SupplierOrderResult } from "./types";

export class RetryableSupplierError extends Error {}

/**
 * Sends a PAID order to its supplier(s). Safe to run more than once for the
 * same order: a unique SupplierOrder row per (order, supplier) plus a lookup
 * by our reference before submitting prevent duplicate supplier orders.
 */
export async function submitSupplierOrder(orderId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { variant: { include: { supplier: true } } } } },
  });
  if (!order) throw new Error(`Order ${orderId} not found`);

  if (order.status === "PAID") {
    await transitionOrder(order.id, "PAID", "SUPPLIER_QUEUED", "Pago confirmado; pedido en cola para proveedor");
  } else if (order.status !== "SUPPLIER_QUEUED") {
    logger.info("supplier_order.skip", { orderId, status: order.status });
    return;
  }

  const bySupplier = new Map<string, typeof order.items>();
  for (const item of order.items) {
    const list = bySupplier.get(item.variant.supplierId) ?? [];
    list.push(item);
    bySupplier.set(item.variant.supplierId, list);
  }

  for (const [supplierId, items] of bySupplier) {
    const supplier = items[0].variant.supplier;
    const adapter = getSupplierAdapter(supplier.adapterKey);

    const so = await db.supplierOrder.upsert({
      where: { orderId_supplierId: { orderId, supplierId } },
      create: { orderId, supplierId },
      update: {},
    });
    if (so.status === "ACCEPTED" || so.status === "SHIPPED") continue;
    if (so.status === "REJECTED") return;

    if (!adapter.simulated && env().ALLOW_REAL_SUPPLIER_ORDERS !== "true") {
      await db.supplierOrder.update({ where: { id: so.id }, data: { lastError: "Bloqueado: pedidos reales desactivados" } });
      await db.incident.create({
        data: {
          level: "warn",
          source: "supplier_order",
          message: `Pedido ${order.number} no enviado a ${supplier.name}: ALLOW_REAL_SUPPLIER_ORDERS no está activado.`,
          context: { orderId },
        },
      });
      return;
    }

    const lines = items.map((i) => ({ supplierSku: i.variant.supplierSku, quantity: i.quantity }));

    // Stock check right before submitting.
    const stock = await adapter.fetchStock(lines.map((l) => l.supplierSku), order.country);
    const short = lines.find((l) => (stock.find((s) => s.supplierSku === l.supplierSku)?.stock ?? 0) < l.quantity);
    let result: SupplierOrderResult;
    if (short) {
      result = { status: "rejected", reason: `Sin stock suficiente: ${short.supplierSku}` };
    } else {
      // A previous attempt may have reached the supplier before timing out.
      const existing = await adapter.findOrderByReference(order.number);
      result = existing
        ? { status: "accepted", externalId: existing.externalId }
        : await adapter.submitOrder({
            reference: order.number,
            shipTo: {
              fullName: order.fullName,
              addressLine1: order.addressLine1,
              addressLine2: order.addressLine2,
              postalCode: order.postalCode,
              city: order.city,
              country: order.country,
              phone: order.phone,
              email: order.email,
            },
            lines,
          });
    }

    if (result.status === "retry") {
      await db.supplierOrder.update({ where: { id: so.id }, data: { lastError: result.reason } });
      throw new RetryableSupplierError(result.reason);
    }

    if (result.status === "rejected") {
      await db.supplierOrder.update({ where: { id: so.id }, data: { status: "REJECTED", lastError: result.reason } });
      await transitionOrder(order.id, "SUPPLIER_QUEUED", "SUPPLIER_REJECTED", `Proveedor rechazó: ${result.reason}`);
      await db.incident.create({
        data: {
          level: "error",
          source: "supplier_order",
          message: `Pedido ${order.number} rechazado por ${supplier.name}: ${result.reason}. Revisar y reembolsar si procede.`,
          context: { orderId },
        },
      });
      return;
    }

    await db.supplierOrder.update({
      where: { id: so.id },
      data: { status: "ACCEPTED", externalId: result.externalId, lastError: null },
    });
  }

  const pending = await db.supplierOrder.count({ where: { orderId, status: { not: "ACCEPTED" } } });
  if (pending === 0) {
    const moved = await transitionOrder(order.id, "SUPPLIER_QUEUED", "SUPPLIER_ACCEPTED", "Proveedor confirmó el pedido");
    if (moved) {
      await enqueueJob("supplier.poll_tracking", { orderId }, { runAt: new Date(Date.now() + 6 * 3600_000) });
    }
  }
}
