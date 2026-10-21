import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

/**
 * Development seed. Products are linked to the SIMULATED supplier and their
 * costs are estimates from MARKET_RESEARCH.md, not supplier quotes.
 */
async function main() {
  const supplier = await db.supplier.upsert({
    where: { code: "sim" },
    create: { code: "sim", name: "Proveedor simulado", adapterKey: "mock", isSimulated: true },
    update: {},
  });

  const fountain = await db.product.upsert({
    where: { slug: "fuente-acero-2-5-l" },
    update: {},
    create: {
      slug: "fuente-acero-2-5-l",
      name: "Fuente para gatos de acero inoxidable 2,5 l",
      subtitle: "Bandeja de acero inoxidable y filtro de recambio (ficha provisional)",
      description:
        "Ficha de ejemplo para desarrollo. Las especificaciones definitivas (ruido medido, consumo, materiales) se publicarán cuando tengamos el producto real del proveedor y lo hayamos probado.",
      manufacturerName: null,
      safetyInformation:
        "Usar solo con el adaptador incluido. Desconectar antes de limpiar. No dejar funcionar la bomba sin agua. (Texto provisional: sustituir por las advertencias del fabricante.)",
    },
  });
  await db.variant.upsert({
    where: { sku: "FF-FUENTE-25" },
    update: {},
    create: { productId: fountain.id, sku: "FF-FUENTE-25", name: "Fuente 2,5 l", priceGrossCents: 3990, stock: 0, supplierId: supplier.id, supplierSku: "SIM-FOUNTAIN-25", supplierCostCents: 1300, supplierShippingCents: 600 },
  });

  const filters = await db.product.upsert({
    where: { slug: "filtros-recambio" },
    update: {},
    create: {
      slug: "filtros-recambio",
      name: "Filtros de recambio (pack de 6)",
      subtitle: "Para unos 3–6 meses, según el agua y el número de gatos",
      description: "Ficha de ejemplo para desarrollo. La compatibilidad exacta se indicará con el producto real.",
    },
  });
  await db.variant.upsert({
    where: { sku: "FF-FILTROS-6" },
    update: {},
    create: { productId: filters.id, sku: "FF-FILTROS-6", name: "Pack de 6", priceGrossCents: 1490, stock: 0, supplierId: supplier.id, supplierSku: "SIM-FILTER-6", supplierCostCents: 400, supplierShippingCents: 0 },
  });

  const brush = await db.product.upsert({
    where: { slug: "cepillo-limpieza-bomba" },
    update: {},
    create: { slug: "cepillo-limpieza-bomba", name: "Cepillo de limpieza para la bomba", subtitle: "Para quitar cal y restos del interior de la bomba", description: "Ficha de ejemplo para desarrollo." },
  });
  await db.variant.upsert({
    where: { sku: "FF-CEPILLO" },
    update: {},
    create: { productId: brush.id, sku: "FF-CEPILLO", name: "Unidad", priceGrossCents: 590, stock: 0, supplierId: supplier.id, supplierSku: "SIM-BRUSH", supplierCostCents: 150, supplierShippingCents: 0 },
  });

  const email = (process.env.ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (password.length >= 12) {
    await db.adminUser.upsert({ where: { email }, update: {}, create: { email, passwordHash: await bcrypt.hash(password, 12) } });
    console.log(`Admin user ready: ${email}`);
  } else {
    console.warn("ADMIN_PASSWORD missing or shorter than 12 characters: admin user not created.");
  }
  console.log("Seed done. Run the inventory sync from /admin/proveedores to load simulated stock.");
}

main().finally(() => db.$disconnect());
