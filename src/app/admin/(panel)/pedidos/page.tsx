import { db } from "@/server/db";
import { formatEur } from "@/server/checkout/pricing";
import { refundAction, retrySupplierAction } from "../../actions";

export default async function OrdersAdmin() {
  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { supplierOrders: true, shipments: true, refunds: true },
  });
  return (
    <div>
      <h1 className="text-lg font-semibold">Pedidos</h1>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm bg-white border border-border rounded-xl">
          <thead className="text-left text-muted">
            <tr><th className="p-3">Pedido</th><th className="p-3">Fecha</th><th className="p-3">Estado</th><th className="p-3">Total</th><th className="p-3">Proveedor</th><th className="p-3">Acciones</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((o) => (
              <tr key={o.id} className="align-top">
                <td className="p-3">{o.number}<br /><span className="text-muted">{o.email}</span></td>
                <td className="p-3">{o.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                <td className="p-3">{o.status}</td>
                <td className="p-3">{formatEur(o.totalGrossCents)}</td>
                <td className="p-3">
                  {o.supplierOrders.map((s) => (
                    <div key={s.id}>{s.status}{s.externalId ? ` · ${s.externalId}` : ""}{s.lastError ? <span className="text-red-700"> · {s.lastError}</span> : null}</div>
                  ))}
                  {o.shipments.map((s) => <div key={s.id}>{s.carrier} {s.trackingNumber}</div>)}
                </td>
                <td className="p-3 space-y-2">
                  {o.status === "SUPPLIER_REJECTED" && (
                    <form action={retrySupplierAction}><input type="hidden" name="orderId" value={o.id} /><button className="underline">Reintentar proveedor</button></form>
                  )}
                  {o.paidAt && o.status !== "REFUNDED" && (
                    <form action={refundAction} className="flex gap-1">
                      <input type="hidden" name="orderId" value={o.id} />
                      <input name="amount" defaultValue={(o.totalGrossCents / 100).toFixed(2)} className="w-20 rounded border border-border px-1" />
                      <input name="reason" placeholder="Motivo" className="w-24 rounded border border-border px-1" />
                      <button className="underline">Reembolsar</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td className="p-3 text-muted" colSpan={6}>Sin pedidos.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
