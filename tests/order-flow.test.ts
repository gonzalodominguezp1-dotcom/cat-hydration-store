import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { startCheckout } from "@/server/checkout/checkout-service";
import { FakePaymentProvider } from "@/server/payments/fake-provider";
import { setPaymentProvider } from "@/server/payments/registry";
import { handlePaymentEvent } from "@/server/payments/webhook-service";
import { WebhookVerificationError, type PaymentEvent } from "@/server/payments/types";
import { drainQueue } from "@/server/jobs/worker";
import { MockSupplierAdapter } from "@/server/suppliers/mock-adapter";
import { registerSupplierAdapter, resetSupplierAdapters } from "@/server/suppliers/registry";
import { syncInventory } from "@/server/suppliers/inventory-sync-service";
import { refundOrder } from "@/server/payments/refund-service";
import { checkoutPayload, resetDb, seedCatalog } from "./helpers";

let pay: FakePaymentProvider;
let supplier: MockSupplierAdapter;

beforeEach(async () => {
  await resetDb();
  pay = new FakePaymentProvider();
  setPaymentProvider(pay);
  resetSupplierAdapters();
  supplier = new MockSupplierAdapter();
  registerSupplierAdapter(supplier);
});

async function paidEvent(orderId: string, id = `evt_${Math.random()}`): Promise<PaymentEvent> {
  const payment = await db.payment.findFirstOrThrow({ where: { orderId } });
  return { id, type: "payment.succeeded", rawType: "test.paid", providerRef: payment.providerRef, providerPaymentId: "pi_1", amountCents: payment.amountCents, currency: "eur" };
}

async function verifiedEvent(e: PaymentEvent) {
  const body = JSON.stringify(e);
  return pay.verifyWebhook(body, new Headers({ "x-fake-signature": pay.sign(body) }));
}

describe("checkout", () => {
  it("computes prices on the server and adds shipping under 49 €", async () => {
    const { fountain } = await seedCatalog();
    const { orderId } = await startCheckout(checkoutPayload(fountain.id));
    const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.subtotalGrossCents).toBe(3990);
    expect(order.shippingGrossCents).toBe(395);
    expect(order.totalGrossCents).toBe(4385);
    expect(order.status).toBe("PENDING_PAYMENT");
  });

  it("is idempotent for the same checkoutKey", async () => {
    const { fountain } = await seedCatalog();
    const payload = checkoutPayload(fountain.id);
    const a = await startCheckout(payload);
    const b = await startCheckout(payload);
    expect(a.orderId).toBe(b.orderId);
    expect(await db.order.count()).toBe(1);
    expect(await db.payment.count()).toBe(1);
  });

  it("rejects quantities above stock and invalid input", async () => {
    const { fountain } = await seedCatalog();
    await expect(startCheckout(checkoutPayload(fountain.id, 11))).rejects.toThrow();
    await db.variant.update({ where: { id: fountain.id }, data: { stock: 1 } });
    await expect(startCheckout(checkoutPayload(fountain.id, 2))).rejects.toThrow(/Stock/);
    await expect(startCheckout({ ...checkoutPayload(fountain.id), acceptTerms: false })).rejects.toThrow();
    await expect(startCheckout({ ...checkoutPayload(fountain.id), country: "DE" })).rejects.toThrow();
  });
});

describe("payment webhooks", () => {
  it("only a verified webhook marks the order as paid, not the redirect", async () => {
    const { fountain } = await seedCatalog();
    const { orderId, redirectUrl } = await startCheckout(checkoutPayload(fountain.id));
    expect(redirectUrl).toContain(`/pedido/${orderId}`);
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("PENDING_PAYMENT");

    const outcome = await handlePaymentEvent("fake", await verifiedEvent(await paidEvent(orderId)));
    expect(outcome).toBe("processed");
    const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe("PAID");
    expect(order.paidAt).not.toBeNull();
  });

  it("rejects webhooks with a bad signature", async () => {
    const body = JSON.stringify({ id: "x" });
    await expect(pay.verifyWebhook(body, new Headers({ "x-fake-signature": "bad" }))).rejects.toBeInstanceOf(WebhookVerificationError);
  });

  it("processes a duplicated webhook only once and enqueues one supplier job", async () => {
    const { fountain } = await seedCatalog();
    const { orderId } = await startCheckout(checkoutPayload(fountain.id));
    const evt = await paidEvent(orderId, "evt_dup");
    const results = await Promise.all([handlePaymentEvent("fake", evt), handlePaymentEvent("fake", evt), handlePaymentEvent("fake", evt)]);
    expect(results.filter((r) => r === "processed")).toHaveLength(1);
    expect(results.filter((r) => r === "duplicate")).toHaveLength(2);
    expect(await db.job.count({ where: { type: "supplier.submit_order" } })).toBe(1);
  });

  it("two different success events for the same payment do not double-queue", async () => {
    const { fountain } = await seedCatalog();
    const { orderId } = await startCheckout(checkoutPayload(fountain.id));
    await handlePaymentEvent("fake", await paidEvent(orderId, "evt_a"));
    await handlePaymentEvent("fake", await paidEvent(orderId, "evt_b"));
    expect(await db.job.count({ where: { type: "supplier.submit_order" } })).toBe(1);
  });

  it("does not mark paid when the amount does not match", async () => {
    const { fountain } = await seedCatalog();
    const { orderId } = await startCheckout(checkoutPayload(fountain.id));
    const evt = { ...(await paidEvent(orderId)), amountCents: 100 };
    expect(await handlePaymentEvent("fake", evt)).toBe("amount_mismatch");
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("PENDING_PAYMENT");
    expect(await db.incident.count({ where: { source: "webhook" } })).toBe(1);
  });

  it("marks failed payments and lets a later success recover", async () => {
    const { fountain } = await seedCatalog();
    const { orderId } = await startCheckout(checkoutPayload(fountain.id));
    const payment = await db.payment.findFirstOrThrow({ where: { orderId } });
    await handlePaymentEvent("fake", { id: "evt_f", type: "payment.failed", rawType: "t", providerRef: payment.providerRef });
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("PAYMENT_FAILED");
    await handlePaymentEvent("fake", await paidEvent(orderId));
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("PAID");
  });

  it("alerts when a payment arrives for a cancelled order", async () => {
    const { fountain } = await seedCatalog();
    const { orderId } = await startCheckout(checkoutPayload(fountain.id));
    const payment = await db.payment.findFirstOrThrow({ where: { orderId } });
    await handlePaymentEvent("fake", { id: "evt_exp", type: "payment.expired", rawType: "t", providerRef: payment.providerRef });
    await handlePaymentEvent("fake", await paidEvent(orderId));
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("CANCELLED");
    expect(await db.job.count()).toBe(0);
    expect(await db.incident.count({ where: { source: "webhook", level: "error" } })).toBe(1);
  });
});

describe("supplier fulfilment", () => {
  it("sends a paid order to the supplier exactly once", async () => {
    const { fountain } = await seedCatalog();
    const { orderId } = await startCheckout(checkoutPayload(fountain.id));
    await handlePaymentEvent("fake", await paidEvent(orderId));
    await drainQueue("t");
    const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { supplierOrders: true } });
    expect(order.status).toBe("SUPPLIER_ACCEPTED");
    expect(order.supplierOrders).toHaveLength(1);
    expect(order.supplierOrders[0].externalId).toBe(`SIM-${order.number}`);

    // Re-running the submit job is a no-op.
    const { submitSupplierOrder } = await import("@/server/suppliers/supplier-order-service");
    await submitSupplierOrder(orderId);
    expect(await db.supplierOrder.count()).toBe(1);
  });

  it("never sends an unpaid order", async () => {
    const { fountain } = await seedCatalog();
    const { orderId } = await startCheckout(checkoutPayload(fountain.id));
    const { submitSupplierOrder } = await import("@/server/suppliers/supplier-order-service");
    await submitSupplierOrder(orderId);
    expect(await db.supplierOrder.count()).toBe(0);
  });

  it("retries temporary supplier failures with backoff", async () => {
    const { fountain } = await seedCatalog();
    const { orderId } = await startCheckout(checkoutPayload(fountain.id));
    await handlePaymentEvent("fake", await paidEvent(orderId));
    supplier.failNextSubmit = "retry";
    await drainQueue("t");
    const job = await db.job.findFirstOrThrow({ where: { type: "supplier.submit_order" } });
    expect(job.status).toBe("PENDING");
    expect(job.attempts).toBe(1);
    expect(job.runAt.getTime()).toBeGreaterThan(Date.now());

    await db.job.update({ where: { id: job.id }, data: { runAt: new Date() } });
    await drainQueue("t");
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("SUPPLIER_ACCEPTED");
  });

  it("records rejections and alerts the admin", async () => {
    const { fountain } = await seedCatalog();
    const { orderId } = await startCheckout(checkoutPayload(fountain.id));
    await handlePaymentEvent("fake", await paidEvent(orderId));
    supplier.failNextSubmit = "reject";
    await drainQueue("t");
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("SUPPLIER_REJECTED");
    expect(await db.incident.count({ where: { source: "supplier_order" } })).toBe(1);
  });

  it("moves exhausted jobs to DEAD and opens an incident", async () => {
    const { fountain } = await seedCatalog();
    const { orderId } = await startCheckout(checkoutPayload(fountain.id));
    await handlePaymentEvent("fake", await paidEvent(orderId));
    await db.job.updateMany({ data: { maxAttempts: 1 } });
    supplier.failNextSubmit = "retry";
    await drainQueue("t");
    expect((await db.job.findFirstOrThrow()).status).toBe("DEAD");
    expect(await db.incident.count({ where: { source: "job:supplier.submit_order" } })).toBe(1);
  });

  it("does not mark shipped or delivered without supplier evidence", async () => {
    const { fountain } = await seedCatalog();
    const { orderId } = await startCheckout(checkoutPayload(fountain.id));
    await handlePaymentEvent("fake", await paidEvent(orderId));
    await drainQueue("t");
    const { pollTracking } = await import("@/server/suppliers/shipment-tracking-service");
    await pollTracking(orderId);
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("SUPPLIER_ACCEPTED");
  });
});

describe("inventory sync", () => {
  it("records cost changes and deactivates unprofitable variants", async () => {
    const { supplier: s, fountain } = await seedCatalog();
    supplier.setStock("SIM-FOUNTAIN-25", 7, 3000);
    const res = await syncInventory(s.id);
    expect(res.deactivated).toBe(1);
    const v = await db.variant.findUniqueOrThrow({ where: { id: fountain.id } });
    expect(v.stock).toBe(7);
    expect(v.active).toBe(false);
    expect(await db.priceChange.count()).toBe(1);
  });
});

describe("refunds", () => {
  it("refunds a paid order and blocks over-refunds", async () => {
    const { fountain } = await seedCatalog();
    const { orderId } = await startCheckout(checkoutPayload(fountain.id));
    await handlePaymentEvent("fake", await paidEvent(orderId));
    await refundOrder(orderId, 4385, "test");
    expect(pay.refunds).toHaveLength(1);
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("REFUNDED");
    await expect(refundOrder(orderId, 1, "again")).rejects.toThrow();
  });
});
