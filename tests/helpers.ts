import { randomUUID } from "node:crypto";
import { db } from "@/server/db";

export async function resetDb() {
  await db.$executeRawUnsafe(`TRUNCATE "OrderStatusEvent","OrderItem","Payment","Refund","Shipment","SupplierOrder","Order","PriceChange","Variant","Product","Supplier","Job","WebhookEvent","Incident" CASCADE`);
}

export async function seedCatalog() {
  const supplier = await db.supplier.create({ data: { code: "sim", name: "Proveedor simulado", adapterKey: "mock", isSimulated: true } });
  const product = await db.product.create({
    data: { slug: "fuente-test", name: "Fuente test", description: "Producto de prueba" },
  });
  const fountain = await db.variant.create({
    data: {
      productId: product.id, sku: "FT-1", name: "2,5 l", priceGrossCents: 3990, stock: 50,
      supplierId: supplier.id, supplierSku: "SIM-FOUNTAIN-25", supplierCostCents: 1300, supplierShippingCents: 600,
    },
  });
  return { supplier, product, fountain };
}

export function checkoutPayload(variantId: string, quantity = 1) {
  return {
    checkoutKey: randomUUID(),
    email: "cliente@example.com",
    fullName: "Cliente Prueba",
    addressLine1: "Calle Falsa 123",
    postalCode: "28001",
    city: "Madrid",
    country: "ES",
    acceptTerms: true,
    lines: [{ variantId, quantity }],
  };
}
