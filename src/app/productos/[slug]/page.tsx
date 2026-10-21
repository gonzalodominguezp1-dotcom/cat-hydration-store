import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/add-to-cart";
import { getProductBySlug } from "@/server/catalog/queries";
import { formatEur } from "@/server/checkout/pricing";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.subtitle ?? product.description.slice(0, 150),
    alternates: { canonical: `/productos/${product.slug}` },
    openGraph: { title: product.name, description: product.subtitle ?? undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    offers: product.variants.map((v) => ({
      "@type": "Offer",
      sku: v.sku,
      price: (v.priceGrossCents / 100).toFixed(2),
      priceCurrency: "EUR",
      availability: v.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${site.url}/productos/${product.slug}`,
    })),
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 grid gap-10 sm:grid-cols-2">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="aspect-square rounded-2xl bg-accent-soft grid place-items-center text-sm text-muted p-6 text-center">
        Fotografías reales pendientes de recibir muestras.
      </div>
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{product.name}</h1>
        {product.subtitle && <p className="mt-2 text-muted">{product.subtitle}</p>}
        <div className="mt-6">
          <AddToCart
            variants={product.variants.map((v) => ({
              id: v.id,
              name: v.name,
              price: formatEur(v.priceGrossCents),
              inStock: v.stock > 0,
            }))}
          />
        </div>
        <div className="mt-8 text-sm leading-relaxed whitespace-pre-line">{product.description}</div>

        <section className="mt-8 rounded-xl border border-border bg-white p-5 text-sm">
          <h2 className="font-medium">Información de seguridad del producto</h2>
          <dl className="mt-3 space-y-2 text-muted">
            <div><dt className="inline font-medium text-foreground">Fabricante: </dt><dd className="inline">{product.manufacturerName ?? "Pendiente"}</dd></div>
            <div><dt className="inline font-medium text-foreground">Dirección: </dt><dd className="inline">{product.manufacturerAddress ?? "Pendiente"}</dd></div>
            <div><dt className="inline font-medium text-foreground">Contacto: </dt><dd className="inline">{product.manufacturerContact ?? "Pendiente"}</dd></div>
            <div><dt className="inline font-medium text-foreground">Responsable en la UE: </dt><dd className="inline">{product.euResponsiblePerson ?? "Pendiente"}</dd></div>
            <div><dt className="font-medium text-foreground">Advertencias:</dt><dd className="whitespace-pre-line">{product.safetyInformation ?? "Pendiente"}</dd></div>
          </dl>
        </section>
      </div>
    </div>
  );
}
