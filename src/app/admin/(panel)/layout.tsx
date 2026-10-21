import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/server/admin/auth";
import { logoutAction } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Administración", robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <nav className="flex flex-wrap items-center gap-4 text-sm border-b border-border pb-4">
        <Link href="/admin" className="font-semibold">Panel</Link>
        <Link href="/admin/pedidos">Pedidos</Link>
        <Link href="/admin/proveedores">Productos y proveedores</Link>
        <Link href="/admin/finanzas">Finanzas</Link>
        <span className="ml-auto text-muted">{admin.email}</span>
        <form action={logoutAction}><button className="underline">Salir</button></form>
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
