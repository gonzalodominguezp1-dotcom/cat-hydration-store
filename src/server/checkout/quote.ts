import { z } from "zod";
import { db } from "../db";
import { shippingFor } from "./pricing";

export const quoteSchema = z.object({
  lines: z.array(z.object({ variantId: z.string().min(1), quantity: z.number().int().min(1).max(10) })).max(20),
});

/** Server-side prices for the cart. The client never sends prices. */
export async function quoteCart(raw: unknown) {
  const { lines } = quoteSchema.parse(raw);
  const variants = await db.variant.findMany({
    where: { id: { in: lines.map((l) => l.variantId) }, active: true, product: { active: true } },
    include: { product: true },
  });
  const items = lines.flatMap((l) => {
    const v = variants.find((x) => x.id === l.variantId);
    if (!v) return [];
    return [{
      variantId: v.id,
      name: `${v.product.name} – ${v.name}`,
      unitPriceCents: v.priceGrossCents,
      quantity: Math.min(l.quantity, Math.max(v.stock, 0)),
      available: v.stock,
    }];
  });
  const subtotalCents = items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0);
  const shippingCents = items.length ? shippingFor(subtotalCents) : 0;
  return { items, subtotalCents, shippingCents, totalCents: subtotalCents + shippingCents };
}
