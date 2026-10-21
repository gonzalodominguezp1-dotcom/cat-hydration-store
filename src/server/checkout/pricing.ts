/** Countries we can ship to and their standard VAT rate (destination VAT, OSS). */
export const SHIPPING_COUNTRIES = {
  ES: { name: "España", vatRate: 0.21, enabled: true },
  DE: { name: "Deutschland", vatRate: 0.19, enabled: false },
  NL: { name: "Nederland", vatRate: 0.21, enabled: false },
  BE: { name: "België / Belgique", vatRate: 0.21, enabled: false },
} as const;

export type CountryCode = keyof typeof SHIPPING_COUNTRIES;

export const SHIPPING_FEE_CENTS = 395;
export const FREE_SHIPPING_FROM_CENTS = 4900;

export function shippingFor(subtotalCents: number): number {
  return subtotalCents >= FREE_SHIPPING_FROM_CENTS ? 0 : SHIPPING_FEE_CENTS;
}

/** VAT contained in a VAT-inclusive amount. */
export function vatIncluded(grossCents: number, vatRate: number): number {
  return Math.round(grossCents - grossCents / (1 + vatRate));
}

export function formatEur(cents: number, locale = "es-ES"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(cents / 100);
}
