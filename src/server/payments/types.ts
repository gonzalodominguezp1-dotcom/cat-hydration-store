export interface CheckoutLine {
  name: string;
  unitAmountCents: number;
  quantity: number;
}

export interface CreateCheckoutInput {
  orderId: string;
  orderNumber: string;
  email: string;
  currency: "EUR";
  lines: CheckoutLine[];
  shippingCents: number;
  totalCents: number;
  successUrl: string;
  cancelUrl: string;
  /** Same key → same provider session; prevents double charges on retries. */
  idempotencyKey: string;
}

export interface CreateCheckoutResult {
  providerRef: string;
  redirectUrl: string;
}

export type PaymentEventType =
  | "payment.succeeded"
  | "payment.failed"
  | "payment.expired"
  | "refund.succeeded"
  | "ignored";

export interface PaymentEvent {
  /** Provider event id, used for idempotency. */
  id: string;
  type: PaymentEventType;
  /** Checkout/session reference stored in Payment.providerRef. */
  providerRef?: string;
  providerPaymentId?: string;
  amountCents?: number;
  currency?: string;
  rawType: string;
}

export class WebhookVerificationError extends Error {}

/**
 * Payment gateway abstraction. Card data never touches our servers: every
 * provider uses a hosted/tokenised checkout.
 */
export interface PaymentProvider {
  readonly key: string;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  /** Verifies the signature and normalises the event. Throws WebhookVerificationError. */
  verifyWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent>;
  refund(providerPaymentId: string, amountCents: number, idempotencyKey: string): Promise<{ providerRef: string }>;
}
