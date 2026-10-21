import { db } from "@/server/db";
import { getSalesMetrics } from "@/server/admin/metrics";
import { formatEur } from "@/server/checkout/pricing";
import { resolveIncidentAction } from "../actions";

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  );
}

export default async function AdminHome() {
  const since = new Date(Date.now() - 30 * 24 * 3600_000);
  const m = await getSalesMetrics(since);
  const [incidents, deadJobs, simulatedSuppliers] = await Promise.all([
    db.incident.findMany({ where: { resolvedAt: null }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.job.count({ where: { status: "DEAD" } }),
    db.supplier.count({ where: { isSimulated: true, active: true } }),
  ]);

  return (
    <div className="space-y-8">
      {simulatedSuppliers > 0 && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm">
          Hay {simulatedSuppliers} proveedor(es) SIMULADO(S) activos. Sus costes y stock no son reales.
        </p>
      )}
      <section>
        <h1 className="text-lg font-semibold">Ventas · últimos 30 días</h1>
        <div className="mt-3 grid gap-3 grid-cols-2 sm:grid-cols-4">
          <Stat label="Pedidos pagados" value={String(m.orders)} />
          <Stat label="Facturación (IVA incl.)" value={formatEur(m.revenueGross)} />
          <Stat label="Ticket medio" value={formatEur(m.aov)} />
          <Stat label="Margen de contribución estimado" value={formatEur(m.estimatedContribution)} note="Antes de publicidad. Estimado." />
          <Stat label="Contribución por pedido" value={formatEur(m.contributionPerOrder)} note="Antes de publicidad." />
          <Stat label="Reembolsado" value={formatEur(m.refunded)} />
          <Stat label="Pendientes de enviar al proveedor" value={String(m.pending)} />
          <Stat label="Rechazados por proveedor" value={String(m.issues)} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Marketing</h2>
        <p className="mt-2 text-sm text-muted">
          Sin integración con plataformas publicitarias todavía: no se muestran tráfico, CAC ni ROAS hasta tener datos reales.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Incidencias abiertas {deadJobs > 0 && <span className="text-red-700">· {deadJobs} trabajos fallidos</span>}</h2>
        <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-white text-sm">
          {incidents.length === 0 && <li className="p-4 text-muted">Sin incidencias.</li>}
          {incidents.map((i) => (
            <li key={i.id} className="flex items-start justify-between gap-4 p-4">
              <div>
                <p><span className={i.level === "error" ? "text-red-700" : "text-amber-700"}>{i.level.toUpperCase()}</span> · {i.source}</p>
                <p className="mt-1">{i.message}</p>
                <p className="text-xs text-muted">{i.createdAt.toISOString()}</p>
              </div>
              <form action={resolveIncidentAction}>
                <input type="hidden" name="id" value={i.id} />
                <button className="underline">Resolver</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
