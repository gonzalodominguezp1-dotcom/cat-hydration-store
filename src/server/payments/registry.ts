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
  const mode = e.PAYMENT_PROVIDER ?? (e.STRIPE_SECRET_KEY ? "stripe" : e.NODE_ENV === "production" ? null : "simulated");
  if (mode === "stripe") return new StripePaymentProvider(e.STRIPE_SECRET_KEY, e.STRIPE_WEBHOOK_SECRET);
  if (mode === "simulated") {
    // Simulated payments, clearly labelled in the UI. Never charges anyone.
    override = new FakePaymentProvider();
    return override;
  }
  throw new Error("No payment provider configured");
}
