import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url().default("http://localhost:3000"),
  STRIPE_SECRET_KEY: z.string().optional().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),
  /**
   * "simulated" uses the signed fake gateway (staging / e2e). It must be set
   * explicitly; production without Stripe keys refuses to start checkouts.
   */
  PAYMENT_PROVIDER: z.enum(["stripe", "simulated"]).optional(),
  ALLOW_REAL_SUPPLIER_ORDERS: z.enum(["true", "false"]).default("false"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (!cached) {
    cached = schema.parse(process.env);
    if (cached.STRIPE_SECRET_KEY.startsWith("sk_live_") && cached.NODE_ENV !== "production") {
      throw new Error("Live Stripe key outside production. Use test keys (sk_test_...).");
    }
  }
  return cached;
}
