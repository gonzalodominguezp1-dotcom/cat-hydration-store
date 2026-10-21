import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "../db";
import { env } from "../env";
import { getPaymentProvider } from "../payments/registry";
import { SHIPPING_COUNTRIES, shippingFor, vatIncluded, type CountryCode } from "./pricing";

const enabledCountries = Object.entries(SHIPPING_COUNTRIES)
  .filter(([, c]) => c.enabled)
  .map(([code]) => code) as [CountryCode, ...CountryCode[]];

export const checkoutSchema = z.object({
  /** Client-generated UUID; resubmitting the same form returns the same order. */
  checkoutKey: z.string().uuid(),
  email: z.string().email().max(200),
  fullName: z.string().trim().min(2).max(120),
  addressLine1: z.string().trim().min(3).max(200),
  addressLine2: z.string().trim().max(200).optional().nullable(),
  postalCode: z.string().trim().regex(/^[0-9A-Za-z -]{3,10}$/),
  city: z.string().trim().min(2).max(100),
  country: z.enum(enabledCountries),
  phone: z.string().trim().max(30).optional().nullable(),
  acceptTerms: z.literal(true),
  lines: z
    .array(z.object({ variantId: z.string().min(1), quantity: z.number().int().min(1).max(10) }))
    .min(1)
    .max(20),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export class CheckoutError extends Error {}

function orderNumber(): string {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  return `P${ymd}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

/**
 * Creates the order with prices computed on the server (never trusted from the
 * client) and opens a hosted checkout session.
 */
export async function startCheckout(raw: unknown): Promise<{ orderId: string; redirectUrl: string }> {
  const input = checkoutSchema.parse(raw);

  const existing = await db.order.findUnique({ where: { checkoutKey: input.checkoutKey }, include: { payments: true } });
  if (existing) {
    if (existing.status !== "PENDING_PAYMENT") throw new CheckoutError("Este pedido ya se ha procesado.");
  }

  const variantIds = [...new Set(input.lines.map((l) => l.variantId))];
  const variants = await db.variant.findMany({
    where: { id: { in: variantIds }, active: true, product: { active: true } },
    include: { product: true },
  });
  const lines = input.lines.map((l) => {
    const v = variants.find((x) => x.id === l.variantId);
    if (!v) throw new CheckoutError("Un producto del carrito ya no está disponible.");
    if (v.stock < l.quantity) throw new CheckoutError(`Stock insuficiente de ${v.product.name}.`);
    return { variant: v, quantity: l.quantity };
  });

  const subtotal = lines.reduce((s, l) => s + l.variant.priceGrossCents * l.quantity, 0);
  const shipping = shippingFor(subtotal);
  const total = subtotal + shipping;
  const vatRate = SHIPPING_COUNTRIES[input.country].vatRate;

  const order =
    existing ??
    (await db.order.create({
      data: {
        number: orderNumber(),
        email: input.email.toLowerCase(),
        fullName: input.fullName,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2 ?? null,
        postalCode: input.postalCode,
        city: input.city,
        country: input.country,
        phone: input.phone ?? null,
        subtotalGrossCents: subtotal,
        shippingGrossCents: shipping,
        totalGrossCents: total,
        vatRate,
        vatCents: vatIncluded(total, vatRate),
        accessToken: randomBytes(24).toString("base64url"),
        checkoutKey: input.checkoutKey,
        items: {
          create: lines.map((l) => ({
            variantId: l.variant.id,
            quantity: l.quantity,
            unitPriceGrossCents: l.variant.priceGrossCents,
            unitCostCents: l.variant.supplierCostCents,
            unitShippingCents: l.variant.supplierShippingCents,
          })),
        },
        statusHistory: { create: { to: "PENDING_PAYMENT", reason: "Pedido creado en checkout" } },
      },
    }));

  const provider = getPaymentProvider();
  const appUrl = env().APP_URL;
  const session = await provider.createCheckout({
    orderId: order.id,
    orderNumber: order.number,
    email: order.email,
    currency: "EUR",
    lines: lines.map((l) => ({
      name: `${l.variant.product.name} – ${l.variant.name}`,
      unitAmountCents: l.variant.priceGrossCents,
      quantity: l.quantity,
    })),
    shippingCents: order.shippingGrossCents,
    totalCents: order.totalGrossCents,
    successUrl: `${appUrl}/pedido/${order.id}?t=${order.accessToken}`,
    cancelUrl: `${appUrl}/carrito?cancelado=1`,
    idempotencyKey: `checkout:${order.id}`,
  });

  await db.payment.upsert({
    where: { providerRef: session.providerRef },
    create: { orderId: order.id, provider: provider.key, providerRef: session.providerRef, amountCents: order.totalGrossCents },
    update: {},
  });

  return { orderId: order.id, redirectUrl: session.redirectUrl };
}
