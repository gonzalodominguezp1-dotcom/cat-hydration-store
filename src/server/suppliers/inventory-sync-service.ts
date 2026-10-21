import { db } from "../db";
import { logger } from "../logger";
import { getSupplierAdapter } from "./registry";

/** VAT and fees used for the safety margin check (Spain, Stripe EEA cards). */
const CHECK_VAT = 0.21;
const CHECK_FEE_PCT = 0.015;
const CHECK_FEE_FIXED_CENTS = 25;

export function contributionCents(priceGrossCents: number, costCents: number, shippingCents: number): number {
  const net = priceGrossCents / (1 + CHECK_VAT);
  const fee = priceGrossCents * CHECK_FEE_PCT + CHECK_FEE_FIXED_CENTS;
  return Math.round(net - costCents - shippingCents - fee);
}

/**
 * Syncs stock and cost from the supplier. Records every cost change and
 * deactivates a variant whose contribution would become negative, raising an
 * incident so the admin can reprice. It never changes selling prices itself.
 */
export async function syncInventory(supplierId: string): Promise<{ updated: number; deactivated: number }> {
  const supplier = await db.supplier.findUniqueOrThrow({ where: { id: supplierId }, include: { variants: true } });
  const adapter = getSupplierAdapter(supplier.adapterKey);
  const stock = await adapter.fetchStock(supplier.variants.map((v) => v.supplierSku), "ES");

  let updated = 0;
  let deactivated = 0;
  for (const v of supplier.variants) {
    const s = stock.find((x) => x.supplierSku === v.supplierSku);
    if (!s) {
      await db.variant.update({ where: { id: v.id }, data: { stock: 0, lastSyncedAt: new Date() } });
      updated++;
      continue;
    }
    if (s.costCents !== v.supplierCostCents) {
      await db.priceChange.create({ data: { variantId: v.id, field: "supplierCost", oldCents: v.supplierCostCents, newCents: s.costCents } });
    }
    if (s.shippingCents !== v.supplierShippingCents) {
      await db.priceChange.create({ data: { variantId: v.id, field: "supplierShipping", oldCents: v.supplierShippingCents, newCents: s.shippingCents } });
    }
    const unprofitable = contributionCents(v.priceGrossCents, s.costCents, s.shippingCents) <= 0;
    await db.variant.update({
      where: { id: v.id },
      data: {
        stock: s.stock,
        supplierCostCents: s.costCents,
        supplierShippingCents: s.shippingCents,
        lastSyncedAt: new Date(),
        ...(unprofitable && v.active ? { active: false } : {}),
      },
    });
    updated++;
    if (unprofitable && v.active) {
      deactivated++;
      await db.incident.create({
        data: {
          level: "warn",
          source: "inventory_sync",
          message: `Variante ${v.sku} desactivada: el nuevo coste deja margen negativo.`,
          context: { variantId: v.id, costCents: s.costCents, shippingCents: s.shippingCents },
        },
      });
    }
  }
  logger.info("inventory.synced", { supplierId, updated, deactivated });
  return { updated, deactivated };
}
