import Stripe from "stripe";
import {
  WebhookVerificationError,
  type CreateCheckoutInput,
  type CreateCheckoutResult,
  type PaymentEvent,
  type PaymentProvider,
} from "./types";

/**
 * Stripe Checkout (hosted page). Payment methods (cards, Bizum, iDEAL,
 * Bancontact...) are enabled in the Stripe dashboard, not hard-coded here.
 */
export class StripePaymentProvider implements PaymentProvider {
  readonly key = "stripe";
  private stripe: Stripe;

  constructor(
    secretKey: string,
    private webhookSecret: string,
  ) {
    if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not set");
    this.stripe = new Stripe(secretKey);
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = input.lines.map((l) => ({
      quantity: l.quantity,
      price_data: { currency: "eur", unit_amount: l.unitAmountCents, product_data: { name: l.name } },
    }));
    if (input.shippingCents > 0) {
      lineItems.push({
        quantity: 1,
        price_data: { currency: "eur", unit_amount: input.shippingCents, product_data: { name: "Envío" } },
      });
    }
    const session = await this.stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer_email: input.email,
        client_reference_id: input.orderId,
        metadata: { orderId: input.orderId, orderNumber: input.orderNumber },
        line_items: lineItems,
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
      },
      { idempotencyKey: input.idempotencyKey },
    );
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { providerRef: session.id, redirectUrl: session.url };
  }

  async verifyWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent> {
    const signature = headers.get("stripe-signature");
    if (!signature || !this.webhookSecret) throw new WebhookVerificationError("Missing signature or secret");
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch (e) {
      throw new WebhookVerificationError(e instanceof Error ? e.message : "Invalid signature");
    }
    return normaliseStripeEvent(event);
  }

  async refund(providerPaymentId: string, amountCents: number, idempotencyKey: string) {
    const refund = await this.stripe.refunds.create(
      { payment_intent: providerPaymentId, amount: amountCents },
      { idempotencyKey },
    );
    return { providerRef: refund.id };
  }
}

export function normaliseStripeEvent(event: Stripe.Event): PaymentEvent {
  const base = { id: event.id, rawType: event.type };
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const s = event.data.object as Stripe.Checkout.Session;
      // A completed session with delayed methods may still be "unpaid".
      if (s.payment_status !== "paid") return { ...base, type: "ignored", providerRef: s.id };
      return {
        ...base,
        type: "payment.succeeded",
        providerRef: s.id,
        providerPaymentId: typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id,
        amountCents: s.amount_total ?? undefined,
        currency: s.currency ?? undefined,
      };
    }
    case "checkout.session.async_payment_failed": {
      const s = event.data.object as Stripe.Checkout.Session;
      return { ...base, type: "payment.failed", providerRef: s.id };
    }
    case "checkout.session.expired": {
      const s = event.data.object as Stripe.Checkout.Session;
      return { ...base, type: "payment.expired", providerRef: s.id };
    }
    case "charge.refunded": {
      const c = event.data.object as Stripe.Charge;
      return {
        ...base,
        type: "refund.succeeded",
        providerPaymentId: typeof c.payment_intent === "string" ? c.payment_intent : c.payment_intent?.id,
        amountCents: c.amount_refunded,
      };
    }
    default:
      return { ...base, type: "ignored" };
  }
}
