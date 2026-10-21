import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { getPaymentProvider } from "@/server/payments/registry";
import { FakePaymentProvider } from "@/server/payments/fake-provider";
import { handlePaymentEvent } from "@/server/payments/webhook-service";

/**
 * SIMULATED GATEWAY ONLY (dev/staging): simulates the provider confirming a payment for an order,
 * going through the same signed-webhook path as a real provider.
 */
export async function POST(req: Request) {
  const provider = getPaymentProvider();
  if (!(provider instanceof FakePaymentProvider)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { orderId, token, outcome } = (await req.json()) as { orderId: string; token: string; outcome: "paid" | "failed" };
  const order = await db.order.findFirst({ where: { id: orderId, accessToken: token }, include: { payments: true } });
  const payment = order?.payments[0];
  if (!order || !payment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const event = {
    id: `fake_evt_${Date.now()}`,
    type: outcome === "paid" ? "payment.succeeded" : "payment.failed",
    rawType: `fake.${outcome}`,
    providerRef: payment.providerRef,
    providerPaymentId: `fake_pi_${order.id}`,
    amountCents: payment.amountCents,
    currency: "eur",
  };
  const body = JSON.stringify(event);
  const verified = await provider.verifyWebhook(body, new Headers({ "x-fake-signature": provider.sign(body) }));
  return NextResponse.json({ outcome: await handlePaymentEvent("fake", verified) });
}
