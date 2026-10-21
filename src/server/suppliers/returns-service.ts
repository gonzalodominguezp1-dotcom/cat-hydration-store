import { db } from "../db";
import { getSupplierAdapter } from "./registry";

/**
 * Asks the supplier for a return authorisation. If the supplier does not
 * support it (or it is the simulation), an incident is opened so the return
 * is handled manually. Refunds to the customer are issued separately through
 * the payment provider.
 */
export async function requestSupplierReturn(orderId: string, reason: string) {
  const sos = await db.supplierOrder.findMany({ where: { orderId }, include: { supplier: true } });
  const results = [];
  for (const so of sos) {
    if (!so.externalId) continue;
    const res = await getSupplierAdapter(so.supplier.adapterKey).requestReturn(so.externalId, reason);
    results.push({ supplier: so.supplier.name, ...res });
    if (!res.accepted) {
      await db.incident.create({
        data: {
          level: "info",
          source: "returns",
          message: `Devolución del pedido ${orderId} con ${so.supplier.name} requiere gestión manual. ${res.note ?? ""}`.trim(),
          context: { orderId, reason },
        },
      });
    }
  }
  return results;
}
