import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LEGAL_PAGES } from "@/lib/legal-pages";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return Object.keys(LEGAL_PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = LEGAL_PAGES[(await params).slug];
  return page ? { title: page.title, alternates: { canonical: `/legal/${(await params).slug}` } } : {};
}

export default async function LegalPage({ params }: Props) {
  const page = LEGAL_PAGES[(await params).slug];
  if (!page) notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="rounded-md bg-amber-50 border border-amber-300 px-3 py-2 text-sm">
        BORRADOR pendiente de revisión legal profesional antes de la publicación de la tienda.
      </p>
      <h1 className="mt-6 text-2xl font-semibold">{page.title}</h1>
      <div className="prose-legal mt-4">
        {page.sections.map((s) => (
          <section key={s.h}>
            <h2>{s.h}</h2>
            {s.p.map((p) => <p key={p}>{p}</p>)}
          </section>
        ))}
      </div>
    </div>
  );
}
