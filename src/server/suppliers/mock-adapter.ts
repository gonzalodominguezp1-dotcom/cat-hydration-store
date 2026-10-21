import type {
  SupplierAdapter,
  SupplierOrderRequest,
  SupplierOrderResult,
  SupplierProduct,
  SupplierStock,
  TrackingInfo,
} from "./types";

/**
 * SIMULATION adapter. It does not contact any real supplier and its catalogue,
 * costs and stock are placeholders (ESTIMATES from MARKET_RESEARCH.md), not
 * quotes. It exists so the full order flow can be developed and tested.
 */
export class MockSupplierAdapter implements SupplierAdapter {
  readonly key = "mock";
  readonly simulated = true;

  private orders = new Map<string, { externalId: string; createdAt: number }>();
  private catalog: SupplierProduct[] = [
    { supplierSku: "SIM-FOUNTAIN-25", name: "[SIMULADO] Fuente acero 2,5 l", costCents: 1300, shippingCents: 600, stock: 120 },
    { supplierSku: "SIM-FILTER-6", name: "[SIMULADO] Filtros recambio x6", costCents: 400, shippingCents: 0, stock: 500 },
    { supplierSku: "SIM-BRUSH", name: "[SIMULADO] Cepillo limpieza bomba", costCents: 150, shippingCents: 0, stock: 300 },
  ];

  /** Test hooks to simulate supplier behaviour. */
  failNextSubmit: "reject" | "retry" | null = null;

  async fetchCatalog(): Promise<SupplierProduct[]> {
    return this.catalog.map((p) => ({ ...p }));
  }

  async fetchStock(skus: string[]): Promise<SupplierStock[]> {
    return this.catalog
      .filter((p) => skus.includes(p.supplierSku))
      .map(({ supplierSku, stock, costCents, shippingCents }) => ({ supplierSku, stock, costCents, shippingCents }));
  }

  setStock(sku: string, stock: number, costCents?: number) {
    const p = this.catalog.find((c) => c.supplierSku === sku);
    if (!p) throw new Error(`Unknown SKU ${sku}`);
    p.stock = stock;
    if (costCents !== undefined) p.costCents = costCents;
  }

  async submitOrder(req: SupplierOrderRequest): Promise<SupplierOrderResult> {
    const existing = this.orders.get(req.reference);
    if (existing) return { status: "accepted", externalId: existing.externalId };

    if (this.failNextSubmit) {
      const kind = this.failNextSubmit;
      this.failNextSubmit = null;
      return kind === "reject"
        ? { status: "rejected", reason: "Simulated rejection" }
        : { status: "retry", reason: "Simulated timeout" };
    }

    for (const line of req.lines) {
      const p = this.catalog.find((c) => c.supplierSku === line.supplierSku);
      if (!p) return { status: "rejected", reason: `Unknown SKU ${line.supplierSku}` };
      if (p.stock < line.quantity) return { status: "rejected", reason: `Out of stock: ${line.supplierSku}` };
    }
    for (const line of req.lines) {
      const p = this.catalog.find((c) => c.supplierSku === line.supplierSku)!;
      p.stock -= line.quantity;
    }
    const externalId = `SIM-${req.reference}`;
    this.orders.set(req.reference, { externalId, createdAt: Date.now() });
    return { status: "accepted", externalId };
  }

  async findOrderByReference(reference: string) {
    const o = this.orders.get(reference);
    return o ? { externalId: o.externalId } : null;
  }

  async getTracking(externalId: string): Promise<TrackingInfo> {
    // The simulation never invents a delivery: it only reports "pending".
    return { externalId, status: "pending", events: [] };
  }

  async requestReturn() {
    return { accepted: false, note: "Simulated supplier: returns are handled manually." };
  }
}
