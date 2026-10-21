import Link from "next/link";
import { getActiveProducts } from "@/server/catalog/queries";
import { formatEur, FREE_SHIPPING_FROM_CENTS } from "@/server/checkout/pricing";

export const dynamic = "force-dynamic";

const reasons = [
  {
    title: "Elegir sin adivinar",
    text: "Te contamos capacidad, material, ruido y cómo se limpia cada fuente, con datos que comprobamos nosotros, no copiados del fabricante.",
  },
  {
    title: "Recambios siempre a mano",
    text: "Los filtros se cambian cada 2–4 semanas según el agua y el número de gatos. Los vendemos sueltos y en packs, sin suscripciones obligatorias.",
  },
  {
    title: "Condiciones claras",
    text: `Precio final con IVA, envío gratis desde ${formatEur(FREE_SHIPPING_FROM_CENTS)}, 14 días para desistir y garantía legal. Sin descuentos inflados ni cuentas atrás.`,
  },
];

export default async function Home() {
  const products = await getActiveProducts();
  return (
    <div className="mx-auto max-w-5xl px-4">
      <section className="py-14 sm:py-20 grid gap-8 sm:grid-cols-2 items-center">
        <div>
          <p className="text-sm font-medium text-accent">Hidratación para gatos de interior</p>
          <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
            Una fuente fácil de limpiar y recambios que no se agotan.
          </h1>
          <p className="mt-4 text-muted leading-relaxed">
            Muchos gatos prefieren beber agua en movimiento. Seleccionamos pocas fuentes, las probamos y te explicamos
            cómo mantenerlas para que el agua esté limpia cada día.
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/productos/fuente-acero-2-5-l" className="rounded-full bg-accent text-white px-5 py-2.5 text-sm font-medium">
              Ver la fuente
            </Link>
            <Link href="/guia/hidratacion-gatos" className="rounded-full border border-border px-5 py-2.5 text-sm">
              Leer la guía
            </Link>
          </div>
        </div>
        <div className="aspect-[4/3] rounded-2xl bg-accent-soft grid place-items-center text-sm text-muted text-center p-6">
          Aquí irá una fotografía real del producto en uso (pendiente de muestras).
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {reasons.map((r) => (
          <div key={r.title} className="rounded-xl border border-border bg-white p-5">
            <h2 className="font-medium">{r.title}</h2>
            <p className="mt-2 text-sm text-muted leading-relaxed">{r.text}</p>
          </div>
        ))}
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-semibold">Productos</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {products.map((p) => (
            <Link key={p.id} href={`/productos/${p.slug}`} className="rounded-xl border border-border bg-white p-5 hover:border-accent">
              <p className="font-medium">{p.name}</p>
              {p.subtitle && <p className="mt-1 text-sm text-muted">{p.subtitle}</p>}
              {p.variants[0] && <p className="mt-3 font-semibold">desde {formatEur(p.variants[0].priceGrossCents)}</p>}
            </Link>
          ))}
          {products.length === 0 && <p className="text-muted text-sm">Catálogo vacío. Ejecuta <code>pnpm db:seed</code>.</p>}
        </div>
      </section>

      <section className="mt-14 rounded-xl border border-border bg-white p-6">
        <h2 className="font-medium">Opiniones</h2>
        <p className="mt-2 text-sm text-muted">
          Todavía no tenemos opiniones verificadas de clientes. Solo publicaremos reseñas de compras reales.
        </p>
      </section>
    </div>
  );
}
