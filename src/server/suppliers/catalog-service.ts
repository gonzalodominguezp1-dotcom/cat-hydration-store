import { db } from "../db";
import { getSupplierAdapter } from "./registry";

/** Lists the supplier catalogue next to what we already sell, for the admin. */
export async function getSupplierCatalog(supplierId: string, country = "ES") {
  const supplier = await db.supplier.findUniqueOrThrow({ where: { id: supplierId }, include: { variants: true } });
  const items = await getSupplierAdapter(supplier.adapterKey).fetchCatalog(country);
  return items.map((p) => ({ ...p, listed: supplier.variants.some((v) => v.supplierSku === p.supplierSku) }));
}
