import type { MetadataRoute } from "next";
import { db } from "@/server/db";
import { site } from "@/lib/site";
import { LEGAL_PAGES } from "@/lib/legal-pages";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await db.product.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } });
  return [
    { url: `${site.url}/`, changeFrequency: "weekly", priority: 1 },
    ...products.map((p) => ({ url: `${site.url}/productos/${p.slug}`, lastModified: p.updatedAt, priority: 0.9 })),
    { url: `${site.url}/guia/hidratacion-gatos`, priority: 0.7 },
    { url: `${site.url}/faq`, priority: 0.5 },
    { url: `${site.url}/contacto`, priority: 0.3 },
    ...Object.keys(LEGAL_PAGES).map((s) => ({ url: `${site.url}/legal/${s}`, priority: 0.1 })),
  ];
}
