import { db } from "@/server/db";
import { formatEur } from "@/server/checkout/pricing";
import { contributionCents } from "@/server/suppliers/inventory-sync-service";
import { syncSupplierAction } from "../../actions";

export default async function SuppliersAdmin() {
  const suppliers = await db.supplier.findMany({ include: { variants: { include: { product: true } } } });
  return (
    <div className="space-y-8">
      {suppliers.map((s) => (
        <section key={s.id}>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">{s.name}</h1>
            {s.isSimulated && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs">SIMULADO</span>}
            <form action={syncSupplierAction} className="ml-auto">
              <input type="hidden" name="supplierId" value={s.id} />
              <button className="rounded-full border border-border px-3 py-1 text-sm">Sincronizar stock y costes</button>
            </form>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm bg-white border border-border">
              <thead className="text-left text-muted">
                <tr><th className="p-2">SKU</th><th className="p-2">Producto</th><th className="p-2">PVP</th><th className="p-2">Coste</th><th className="p-2">Envío prov.</th><th className="p-2">Contribución est.</th><th className="p-2">Stock</th><th className="p-2">Activo</th><th className="p-2">Última sync</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {s.variants.map((v) => {
                  const c = contributionCents(v.priceGrossCents, v.supplierCostCents, v.supplierShippingCents);
                  return (
                    <tr key={v.id}>
                      <td className="p-2">{v.sku}</td>
                      <td className="p-2">{v.product.name} – {v.name}</td>
                      <td className="p-2">{formatEur(v.priceGrossCents)}</td>
                      <td className="p-2">{formatEur(v.supplierCostCents)}</td>
                      <td className="p-2">{formatEur(v.supplierShippingCents)}</td>
                      <td className={`p-2 ${c <= 0 ? "text-red-700 font-medium" : ""}`}>{formatEur(c)}</td>
                      <td className="p-2">{v.stock}</td>
                      <td className="p-2">{v.active ? "Sí" : "No"}</td>
                      <td className="p-2">{v.lastSyncedAt?.toISOString().slice(0, 16).replace("T", " ") ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted">Contribución estimada por unidad vendida sola en España (IVA 21 %, comisión 1,5 % + 0,25 €), antes de publicidad y devoluciones.</p>
        </section>
      ))}
    </div>
  );
}
