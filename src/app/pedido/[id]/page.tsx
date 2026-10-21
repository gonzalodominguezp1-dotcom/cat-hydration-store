import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { formatEur } from "@/server/checkout/pricing";
import { ORDER_STATUS_TEXT } from "@/lib/order-status";
import { OrderClientActions } from "@/components/order-client-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu pedido", robots: { index: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> };

export default async function OrderPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { t } = await searchParams;
  if (!t) notFound();
  // The status comes from the database (webhook), never from the redirect itself.
  const order = await db.order.findFirst({
    where: { id, accessToken: t },
    include: { items: { include: { variant: { include: { product: true } } } }, shipments: true, payments: true },
  });
  if (!order) notFound();

  const status = ORDER_STATUS_TEXT[order.status];
  const fakeMode = order.payments[0]?.provider === "fake";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-sm text-muted">Pedido {order.number}</p>
      <h1 className="mt-1 text-2xl font-semibold">{status.label}</h1>
      <p className="mt-2 text-muted">{status.detail}</p>

      <OrderClientActions
        orderId={order.id}
        token={t}
        pending={order.status === "PENDING_PAYMENT"}
        paid={order.paidAt !== null}
        fakeMode={fakeMode}
      />

      <ul className="mt-8 divide-y divide-border rounded-xl border border-border bg-white text-sm">
        {order.items.map((i) => (
          <li key={i.id} className="flex justify-between p-4">
            <span>{i.quantity} × {i.variant.product.name} – {i.variant.name}</span>
            <span>{formatEur(i.unitPriceGrossCents * i.quantity)}</span>
          </li>
        ))}
        <li className="flex justify-between p-4"><span>Envío</span><span>{formatEur(order.shippingGrossCents)}</span></li>
        <li className="flex justify-between p-4 font-semibold"><span>Total (IVA incl.)</span><span>{formatEur(order.totalGrossCents)}</span></li>
      </ul>

      {order.shipments.map((s) => (
        <div key={s.id} className="mt-6 rounded-xl border border-border bg-white p-4 text-sm">
          <p className="font-medium">Seguimiento: {s.carrier} {s.trackingNumber}</p>
          {s.trackingUrl && <a className="underline" href={s.trackingUrl} rel="noopener noreferrer" target="_blank">Ver en la web del transportista</a>}
        </div>
      ))}
    </div>
  );
}
