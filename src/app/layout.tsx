import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} · ${site.tagline}`, template: `%s · ${site.name}` },
  description:
    "Fuentes bebedero para gatos, filtros de recambio y guías prácticas para elegir, limpiar y mantener la fuente de tu gato.",
  openGraph: { siteName: site.name, locale: "es_ES", type: "website" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="antialiased min-h-screen flex flex-col">
        <header className="border-b border-border bg-white/80">
          <nav className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between gap-4">
            <Link href="/" className="font-semibold tracking-tight">
              {site.name}
            </Link>
            <div className="flex items-center gap-5 text-sm">
              <Link href="/productos/fuente-acero-2-5-l">Fuente</Link>
              <Link href="/productos/filtros-recambio">Filtros</Link>
              <Link href="/guia/hidratacion-gatos" className="hidden sm:inline">Guía</Link>
              <Link href="/faq" className="hidden sm:inline">FAQ</Link>
              <Link href="/carrito" className="rounded-full bg-accent text-white px-3 py-1.5">
                Carrito
              </Link>
            </div>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border mt-16 text-sm text-muted">
          <div className="mx-auto max-w-5xl px-4 py-8 grid gap-6 sm:grid-cols-3">
            <div>
              <p className="font-medium text-foreground">{site.name}</p>
              <p className="mt-1">{site.seller.legalName}</p>
              <p>{site.seller.taxId}</p>
              <p>{site.seller.address}</p>
            </div>
            <ul className="space-y-1">
              <li><Link href="/legal/aviso-legal">Aviso legal</Link></li>
              <li><Link href="/legal/condiciones">Condiciones de venta</Link></li>
              <li><Link href="/legal/devoluciones">Devoluciones y garantía</Link></li>
              <li><Link href="/legal/envios">Envíos</Link></li>
            </ul>
            <ul className="space-y-1">
              <li><Link href="/legal/privacidad">Privacidad</Link></li>
              <li><Link href="/legal/cookies">Cookies</Link></li>
              <li><Link href="/seguimiento">Seguimiento de pedido</Link></li>
              <li><Link href="/contacto">Contacto</Link></li>
            </ul>
          </div>
        </footer>
      </body>
    </html>
  );
}
