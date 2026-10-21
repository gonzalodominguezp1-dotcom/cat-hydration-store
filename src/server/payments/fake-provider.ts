import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import {
  WebhookVerificationError,
  type CreateCheckoutInput,
  type CreateCheckoutResult,
  type PaymentEvent,
  type PaymentProvider,
} from "./types";

/**
 * Test-only provider with HMAC-signed webhooks. Used by integration tests and
 * local development without Stripe keys. Never enabled in production.
 */
export class FakePaymentProvider implements PaymentProvider {
  readonly key = "fake";
  private sessions = new Map<string, CreateCheckoutResult>();
  refunds: { paymentId: string; amountCents: number }[] = [];

  constructor(private secret = "fake_webhook_secret") {}

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const existing = this.sessions.get(input.idempotencyKey);
    if (existing) return existing;
    const providerRef = `fake_cs_${randomUUID()}`;
    const result = { providerRef, redirectUrl: `${input.successUrl}&fake_session=${providerRef}` };
    this.sessions.set(input.idempotencyKey, result);
    return result;
  }

  sign(body: string): string {
    return createHmac("sha256", this.secret).update(body).digest("hex");
  }

  async verifyWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent> {
    const sig = headers.get("x-fake-signature") ?? "";
    const expected = this.sign(rawBody);
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      throw new WebhookVerificationError("Invalid signature");
    }
    return JSON.parse(rawBody) as PaymentEvent;
  }

  async refund(paymentId: string, amountCents: number) {
    this.refunds.push({ paymentId, amountCents });
    return { providerRef: `fake_re_${randomUUID()}` };
  }
}
