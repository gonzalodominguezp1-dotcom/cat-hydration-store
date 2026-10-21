import { NextResponse } from "next/server";
import { env } from "@/server/env";
import { logger } from "@/server/logger";
import { StripePaymentProvider } from "@/server/payments/stripe-provider";
import { WebhookVerificationError } from "@/server/payments/types";
import { handlePaymentEvent } from "@/server/payments/webhook-service";

export async function POST(req: Request) {
  const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } = env();
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const provider = new StripePaymentProvider(STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET);
  // The raw body is required for signature verification.
  const raw = await req.text();
  try {
    const event = await provider.verifyWebhook(raw, req.headers);
    const outcome = await handlePaymentEvent("stripe", event);
    logger.info("webhook.stripe", { eventId: event.id, type: event.rawType, outcome });
    return NextResponse.json({ received: true, outcome });
  } catch (e) {
    if (e instanceof WebhookVerificationError) {
      logger.warn("webhook.stripe.invalid_signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
    logger.error("webhook.stripe.failed", { error: String(e) });
    // 500 makes Stripe retry later; the event was not recorded.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
