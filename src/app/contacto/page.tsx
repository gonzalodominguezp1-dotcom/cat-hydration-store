import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Contacto", alternates: { canonical: "/contacto" } };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Contacto y soporte</h1>
      <p className="mt-4 text-muted leading-relaxed">
        Escríbenos a <a className="underline" href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a> con tu número de
        pedido si ya has comprado. Respondemos en días laborables.
      </p>
      <div className="mt-6 rounded-xl border border-border bg-white p-5 text-sm">
        <p className="font-medium">Datos del vendedor</p>
        <p className="mt-2 text-muted">{site.seller.legalName}</p>
        <p className="text-muted">{site.seller.taxId}</p>
        <p className="text-muted">{site.seller.address}</p>
      </div>
    </div>
  );
}
