import { db } from "../db";

export async function getActiveProducts() {
  return db.product.findMany({
    where: { active: true },
    include: { variants: { where: { active: true }, orderBy: { priceGrossCents: "asc" } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function getProductBySlug(slug: string) {
  return db.product.findFirst({
    where: { slug, active: true },
    include: { variants: { where: { active: true }, orderBy: { priceGrossCents: "asc" } } },
  });
}
