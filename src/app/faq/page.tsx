import type { Metadata } from "next";
import { formatEur, FREE_SHIPPING_FROM_CENTS, SHIPPING_FEE_CENTS } from "@/server/checkout/pricing";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description: "Envíos, devoluciones, garantía, limpieza y recambios de las fuentes para gatos.",
  alternates: { canonical: "/faq" },
};

const faqs = [
  { q: "¿Cuánto cuesta el envío?", a: `${formatEur(SHIPPING_FEE_CENTS)} a España peninsular. Gratis a partir de ${formatEur(FREE_SHIPPING_FROM_CENTS)}. El plazo exacto se confirmará cuando cerremos el acuerdo con el almacén; no lo anunciamos hasta poder cumplirlo.` },
  { q: "¿Puedo devolver el producto?", a: "Sí. Tienes 14 días naturales desde la entrega para desistir sin dar explicaciones. Consulta los pasos en Devoluciones y garantía." },
  { q: "¿Qué garantía tiene?", a: "La garantía legal de conformidad de 3 años para productos nuevos vendidos a consumidores en España." },
  { q: "¿Cada cuánto se cambia el filtro?", a: "Los fabricantes suelen recomendar cada 2–4 semanas, según la dureza del agua y cuántos gatos beban. Sigue siempre las instrucciones de tu modelo." },
  { q: "¿Una fuente hace que mi gato beba más?", a: "Muchos dueños lo observan, pero cada gato es distinto y no prometemos resultados de salud. Si te preocupa la hidratación de tu gato, consulta con tu veterinario." },
  { q: "¿Cómo pago?", a: "Con tarjeta y otros métodos en la página segura de nuestra pasarela de pago. No guardamos los datos de tu tarjeta." },
];

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="text-2xl font-semibold">Preguntas frecuentes</h1>
      <div className="mt-6 divide-y divide-border rounded-xl border border-border bg-white">
        {faqs.map((f) => (
          <details key={f.q} className="p-5">
            <summary className="cursor-pointer font-medium">{f.q}</summary>
            <p className="mt-2 text-sm text-muted leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
