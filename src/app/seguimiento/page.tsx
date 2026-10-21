import type { Metadata } from "next";
import { db } from "@/server/db";
import { ORDER_STATUS_TEXT } from "@/lib/order-status";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Seguimiento de pedido", robots: { index: false } };

type Props = { searchParams: Promise<{ numero?: string; email?: string }> };

export default async function TrackingPage({ searchParams }: Props) {
  const { numero, email } = await searchParams;
  const order =
    numero && email
      ? await db.order.findFirst({
          where: { number: numero.trim().toUpperCase(), email: email.trim().toLowerCase() },
          include: { shipments: true },
        })
      : null;

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Seguimiento de pedido</h1>
      <form className="mt-6 grid gap-3 text-sm" method="get">
        <input name="numero" defaultValue={numero} required placeholder="Número de pedido (P2026...)" className="rounded-md border border-border px-3 py-2" />
        <input name="email" defaultValue={email} type="email" required placeholder="Email de la compra" className="rounded-md border border-border px-3 py-2" />
        <button className="rounded-full bg-accent text-white px-5 py-2.5 font-medium">Consultar</button>
      </form>
      {numero && email && !order && <p className="mt-6 text-sm text-muted">No encontramos un pedido con esos datos.</p>}
      {order && (
        <div className="mt-6 rounded-xl border border-border bg-white p-5 text-sm">
          <p className="font-medium">{ORDER_STATUS_TEXT[order.status].label}</p>
          <p className="mt-1 text-muted">{ORDER_STATUS_TEXT[order.status].detail}</p>
          {order.shipments.map((s) => (
            <p key={s.id} className="mt-3">
              {s.carrier} · {s.trackingNumber}{" "}
              {s.trackingUrl && <a className="underline" href={s.trackingUrl} target="_blank" rel="noopener noreferrer">ver</a>}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
