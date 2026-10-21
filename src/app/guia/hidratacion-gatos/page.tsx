import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Guía: cómo elegir y mantener una fuente para gatos",
  description: "Capacidad, material, ruido, limpieza de la bomba y cambio de filtros: lo que conviene saber antes de comprar una fuente para tu gato.",
  alternates: { canonical: "/guia/hidratacion-gatos" },
};

export default function GuidePage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 prose-legal">
      <h1 className="text-3xl font-semibold tracking-tight">Cómo elegir y mantener una fuente para gatos</h1>
      <p>
        Esta guía resume criterios prácticos. No sustituye el consejo de un veterinario: si tu gato bebe muy poco o muy
        de repente mucho más, consúltalo con un profesional.
      </p>
      <h2>1. Capacidad</h2>
      <p>Para un gato suele bastar con 1,5–2,5 litros; con varios gatos, una fuente más grande evita rellenar cada día.</p>
      <h2>2. Material</h2>
      <p>El acero inoxidable y la cerámica son fáciles de limpiar y no se rayan como el plástico. Comprueba qué piezas van al lavavajillas.</p>
      <h2>3. Ruido y bomba</h2>
      <p>La bomba debe limpiarse periódicamente. Un zumbido suele indicar poca agua o cal en la bomba. Valora modelos con apagado automático cuando el agua está baja.</p>
      <h2>4. Filtros</h2>
      <p>La mayoría de fabricantes recomiendan cambiar el filtro cada 2–4 semanas. Con agua dura, más a menudo.</p>
      <p className="mt-6">
        <Link className="underline" href="/productos/filtros-recambio">Ver filtros de recambio</Link>
      </p>
    </article>
  );
}
