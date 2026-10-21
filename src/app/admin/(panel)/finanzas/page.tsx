import { db } from "@/server/db";
import { computeMonthlyModel, monthlyModelInputSchema, type MonthlyModelInput } from "@/lib/finance/monthly-model";
import { DEFAULT_SCENARIOS, type ScenarioKey } from "@/lib/finance/scenarios";
import { evaluateAdTest } from "@/lib/finance/decisions";
import { saveScenarioAction } from "../../actions";

const LABELS: Record<ScenarioKey, string> = { conservative: "Conservador", base: "Base", optimistic: "Optimista" };
const eur = (n: number) => (Number.isFinite(n) ? new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n) : "∞");
const num = (n: number) => (Number.isFinite(n) ? n.toLocaleString("es-ES", { maximumFractionDigits: 2 }) : "∞");

const FIELDS: { name: string; label: string; get: (s: MonthlyModelInput) => number }[] = [
  { name: "priceGross", label: "PVP con IVA (€)", get: (s) => s.unit.priceGross },
  { name: "vatRate", label: "IVA (%)", get: (s) => s.unit.vatRate * 100 },
  { name: "productCost", label: "Coste producto (€)", get: (s) => s.unit.productCost },
  { name: "shippingCost", label: "Envío (€)", get: (s) => s.unit.shippingCost },
  { name: "paymentFeePct", label: "Comisión cobro (%)", get: (s) => s.unit.paymentFeePct * 100 },
  { name: "paymentFeeFixed", label: "Comisión fija (€)", get: (s) => s.unit.paymentFeeFixed },
  { name: "returnsProvisionPct", label: "Provisión devoluciones (% neto)", get: (s) => s.unit.returnsProvisionPct * 100 },
  { name: "otherVariableCost", label: "Otros variables (€)", get: (s) => s.unit.otherVariableCost },
  { name: "cac", label: "CAC (€)", get: (s) => s.unit.cac },
  { name: "ordersPerMonth", label: "Pedidos/mes", get: (s) => s.ordersPerMonth },
  { name: "repeatOrdersPerMonth", label: "Recompras/mes", get: (s) => s.repeatOrdersPerMonth ?? 0 },
  { name: "repeatContribution", label: "Contribución recompra (€)", get: (s) => s.repeatContribution ?? 0 },
  { name: "fixedCostsMonthly", label: "Costes fijos/mes (€)", get: (s) => s.fixedCostsMonthly },
  { name: "cashGapDays", label: "Desfase de caja (días)", get: (s) => s.cashGapDays },
];

type Props = { searchParams: Promise<{ spend?: string; orders?: string; budget?: string; bcac?: string }> };

export default async function FinancePage({ searchParams }: Props) {
  const saved = await db.financeScenario.findMany();
  const scenarios = (Object.keys(DEFAULT_SCENARIOS) as ScenarioKey[]).map((key) => {
    const row = saved.find((s) => s.key === key);
    const parsed = row ? monthlyModelInputSchema.safeParse(row.params) : null;
    const input: MonthlyModelInput = parsed?.success ? parsed.data : DEFAULT_SCENARIOS[key];
    return { key, input, result: computeMonthlyModel(input), custom: Boolean(parsed?.success) };
  });

  const q = await searchParams;
  const evaluation =
    q.spend && q.orders && q.budget && q.bcac
      ? evaluateAdTest({ spend: Number(q.spend), orders: Number(q.orders), approvedTestBudget: Number(q.budget), breakevenCac: Number(q.bcac) })
      : null;

  return (
    <div className="space-y-10">
      <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm">
        Los valores por defecto son ESTIMACIONES (coste de proveedor y CAC no verificados). Un ROAS alto no implica rentabilidad: compáralo con el ROAS de equilibrio.
      </p>

      <section>
        <h1 className="text-lg font-semibold">Escenarios</h1>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm bg-white border border-border">
            <thead className="text-left text-muted"><tr><th className="p-2">Métrica</th>{scenarios.map((s) => <th key={s.key} className="p-2">{LABELS[s.key]}{s.custom ? " *" : ""}</th>)}</tr></thead>
            <tbody className="divide-y divide-border">
              {[
                ["Precio sin IVA", (r: (typeof scenarios)[number]) => eur(r.result.unit.priceNet)],
                ["Costes variables / pedido", (r: (typeof scenarios)[number]) => eur(r.result.unit.variableCosts)],
                ["Contribución antes de publicidad", (r: (typeof scenarios)[number]) => eur(r.result.unit.contributionBeforeAds)],
                ["Margen de contribución", (r: (typeof scenarios)[number]) => `${num(r.result.unit.contributionMarginPct)} %`],
                ["CAC máximo (equilibrio)", (r: (typeof scenarios)[number]) => eur(r.result.unit.breakevenCac)],
                ["ROAS de equilibrio (con IVA)", (r: (typeof scenarios)[number]) => num(r.result.unit.breakevenRoasGross)],
                ["Beneficio por pedido (tras CAC)", (r: (typeof scenarios)[number]) => eur(r.result.unit.profitPerOrder)],
                ["Facturación mensual", (r: (typeof scenarios)[number]) => eur(r.result.revenueGross)],
                ["Gasto publicitario mensual", (r: (typeof scenarios)[number]) => eur(r.result.adSpend)],
                ["Resultado operativo mensual", (r: (typeof scenarios)[number]) => eur(r.result.operatingProfit)],
                ["Pedidos para cubrir fijos", (r: (typeof scenarios)[number]) => num(r.result.breakevenOrders)],
                ["Capital circulante necesario", (r: (typeof scenarios)[number]) => eur(r.result.workingCapitalNeed)],
              ].map(([label, fn]) => (
                <tr key={label as string}><td className="p-2 text-muted">{label as string}</td>{scenarios.map((s) => <td key={s.key} className="p-2">{(fn as (r: (typeof scenarios)[number]) => string)(s)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-xs text-muted">* Parámetros editados desde este panel.</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {scenarios.map((s) => (
          <form key={s.key} action={saveScenarioAction} className="rounded-xl border border-border bg-white p-4 text-sm grid gap-2">
            <input type="hidden" name="key" value={s.key} />
            <h2 className="font-medium">Editar: {LABELS[s.key]}</h2>
            {FIELDS.map((f) => (
              <label key={f.name} className="flex items-center justify-between gap-2">
                <span className="text-muted">{f.label}</span>
                <input name={f.name} defaultValue={Number(f.get(s.input).toFixed(4))} className="w-24 rounded border border-border px-2 py-1 text-right" />
              </label>
            ))}
            <button className="mt-2 rounded-full bg-accent text-white px-4 py-2">Guardar</button>
          </form>
        ))}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Evaluar una prueba de publicidad</h2>
        <form className="mt-3 flex flex-wrap gap-3 text-sm" method="get">
          <input name="spend" defaultValue={q.spend} placeholder="Gasto (€)" className="w-28 rounded border border-border px-2 py-1" />
          <input name="orders" defaultValue={q.orders} placeholder="Pedidos" className="w-24 rounded border border-border px-2 py-1" />
          <input name="bcac" defaultValue={q.bcac ?? String(scenarios[1].result.unit.breakevenCac)} placeholder="CAC equilibrio (€)" className="w-32 rounded border border-border px-2 py-1" />
          <input name="budget" defaultValue={q.budget} placeholder="Presupuesto aprobado (€)" className="w-44 rounded border border-border px-2 py-1" />
          <button className="rounded-full border border-border px-4 py-1">Evaluar</button>
        </form>
        {evaluation && (
          <div className="mt-3 rounded-xl border border-border bg-white p-4 text-sm">
            <p className="font-medium">Decisión: {evaluation.decision}</p>
            <p className="mt-1">{evaluation.reason}</p>
            <p className="mt-1 text-muted">
              CAC observado {evaluation.cacPoint === null ? "—" : eur(evaluation.cacPoint)} · intervalo 90 %: {eur(evaluation.cacOptimistic)} – {eur(evaluation.cacPessimistic)}
            </p>
            {evaluation.requiresHumanApproval && <p className="mt-1 text-amber-700">Aumentar presupuesto requiere aprobación manual. El sistema no lo hace solo.</p>}
          </div>
        )}
      </section>
    </div>
  );
}
