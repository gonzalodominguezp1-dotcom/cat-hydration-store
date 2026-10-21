"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { readCart, writeCart, type CartLine } from "@/lib/cart";

interface Quote {
  items: { variantId: string; name: string; unitPriceCents: number; quantity: number; available: number }[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
}

const eur = (c: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(c / 100);

export function CartView() {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Stable per cart session so a double click does not create two orders.
  const checkoutKey = useMemo(() => crypto.randomUUID(), []);

  useEffect(() => setLines(readCart()), []);

  useEffect(() => {
    if (lines.length === 0) {
      setQuote(null);
      return;
    }
    fetch("/api/cart/quote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lines }) })
      .then((r) => r.json())
      .then(setQuote)
      .catch(() => setError("No se pudo calcular el carrito."));
  }, [lines]);

  function update(variantId: string, quantity: number) {
    const next = quantity <= 0 ? lines.filter((l) => l.variantId !== variantId) : lines.map((l) => (l.variantId === variantId ? { ...l, quantity } : l));
    setLines(next);
    writeCart(next);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const f = new FormData(e.currentTarget);
    const body = {
      checkoutKey,
      email: f.get("email"),
      fullName: f.get("fullName"),
      addressLine1: f.get("addressLine1"),
      addressLine2: f.get("addressLine2") || null,
      postalCode: f.get("postalCode"),
      city: f.get("city"),
      country: "ES",
      phone: f.get("phone") || null,
      acceptTerms: f.get("acceptTerms") === "on",
      lines: quote?.items.filter((i) => i.quantity > 0).map((i) => ({ variantId: i.variantId, quantity: i.quantity })) ?? [],
    };
    const res = await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "No se pudo iniciar el pago.");
      setSubmitting(false);
      return;
    }
    window.location.href = data.redirectUrl;
  }

  if (lines.length === 0) {
    return (
      <p className="mt-6 text-muted">
        Tu carrito está vacío. <Link href="/" className="underline">Ver productos</Link>
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-8">
      <ul className="divide-y divide-border rounded-xl border border-border bg-white">
        {quote?.items.map((i) => (
          <li key={i.variantId} className="flex items-center justify-between gap-4 p-4 text-sm">
            <div>
              <p className="font-medium">{i.name}</p>
              <p className="text-muted">{eur(i.unitPriceCents)} / ud.</p>
              {i.available < 1 && <p className="text-red-700">Sin stock</p>}
            </div>
            <div className="flex items-center gap-2">
              <input
                aria-label="Cantidad"
                type="number"
                min={0}
                max={10}
                value={lines.find((l) => l.variantId === i.variantId)?.quantity ?? i.quantity}
                onChange={(e) => update(i.variantId, Number(e.target.value))}
                className="w-16 rounded-md border border-border px-2 py-1"
              />
              <button type="button" onClick={() => update(i.variantId, 0)} className="text-muted underline">Quitar</button>
            </div>
          </li>
        ))}
      </ul>

      {quote && (
        <dl className="text-sm space-y-1">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{eur(quote.subtotalCents)}</dd></div>
          <div className="flex justify-between"><dt>Envío (España peninsular)</dt><dd>{quote.shippingCents === 0 ? "Gratis" : eur(quote.shippingCents)}</dd></div>
          <div className="flex justify-between font-semibold text-base"><dt>Total (IVA incluido)</dt><dd>{eur(quote.totalCents)}</dd></div>
        </dl>
      )}

      <form onSubmit={onSubmit} className="grid gap-3 rounded-xl border border-border bg-white p-5 text-sm">
        <h2 className="font-medium text-base">Datos de envío</h2>
        <input name="email" type="email" required placeholder="Email" autoComplete="email" className="rounded-md border border-border px-3 py-2" />
        <input name="fullName" required placeholder="Nombre y apellidos" autoComplete="name" className="rounded-md border border-border px-3 py-2" />
        <input name="addressLine1" required placeholder="Dirección" autoComplete="address-line1" className="rounded-md border border-border px-3 py-2" />
        <input name="addressLine2" placeholder="Piso, puerta (opcional)" autoComplete="address-line2" className="rounded-md border border-border px-3 py-2" />
        <div className="grid grid-cols-2 gap-3">
          <input name="postalCode" required placeholder="Código postal" autoComplete="postal-code" className="rounded-md border border-border px-3 py-2" />
          <input name="city" required placeholder="Ciudad" autoComplete="address-level2" className="rounded-md border border-border px-3 py-2" />
        </div>
        <input name="phone" placeholder="Teléfono para el transportista (opcional)" autoComplete="tel" className="rounded-md border border-border px-3 py-2" />
        <p className="text-muted">Por ahora solo enviamos a España.</p>
        <label className="flex gap-2 items-start">
          <input name="acceptTerms" type="checkbox" required className="mt-1" />
          <span>
            He leído las <Link href="/legal/condiciones" className="underline">condiciones de venta</Link> y la{" "}
            <Link href="/legal/privacidad" className="underline">política de privacidad</Link>.
          </span>
        </label>
        {error && <p className="text-red-700">{error}</p>}
        <button disabled={submitting || !quote?.items.length} className="rounded-full bg-accent text-white px-6 py-3 font-medium disabled:opacity-40">
          {submitting ? "Redirigiendo al pago…" : "Pagar con obligación de pago"}
        </button>
        <p className="text-muted text-xs">El pago se realiza en la página segura de nuestra pasarela. No almacenamos datos de tarjeta.</p>
      </form>
    </div>
  );
}
