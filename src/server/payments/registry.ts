import { env } from "../env";
import { FakePaymentProvider } from "./fake-provider";
import { StripePaymentProvider } from "./stripe-provider";
import type { PaymentProvider } from "./types";

let override: PaymentProvider | null = null;

/** Tests inject a provider here. */
export function setPaymentProvider(p: PaymentProvider | null) {
  override = p;
}

export function getPaymentProvider(): PaymentProvider {
  if (override) return override;
  const e = env();
  if (e.STRIPE_SECRET_KEY) return new StripePaymentProvider(e.STRIPE_SECRET_KEY, e.STRIPE_WEBHOOK_SECRET);
  if (e.NODE_ENV === "production") throw new Error("No payment provider configured");
  // Development without keys: simulated payments, clearly labelled in the UI.
  override = new FakePaymentProvider();
  return override;
}
