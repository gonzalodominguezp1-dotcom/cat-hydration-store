"use client";

import { useState } from "react";
import { addToCart } from "@/lib/cart";

interface VariantOption {
  id: string;
  name: string;
  price: string;
  inStock: boolean;
}

export function AddToCart({ variants }: { variants: VariantOption[] }) {
  const [variantId, setVariantId] = useState(variants.find((v) => v.inStock)?.id ?? variants[0]?.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const selected = variants.find((v) => v.id === variantId);

  if (variants.length === 0) return <p className="text-muted">No disponible.</p>;

  return (
    <div className="space-y-4">
      {variants.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {variants.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVariantId(v.id)}
              className={`rounded-full border px-4 py-2 text-sm ${v.id === variantId ? "border-accent bg-accent-soft" : "border-border"}`}
            >
              {v.name}
            </button>
          ))}
        </div>
      )}
      <p className="text-2xl font-semibold">
        {selected?.price} <span className="text-sm font-normal text-muted">IVA incluido</span>
      </p>
      <p className="text-sm text-muted">{selected?.inStock ? "Disponible" : "Sin stock en este momento"}</p>
      <div className="flex items-center gap-3">
        <label className="text-sm" htmlFor="qty">Cantidad</label>
        <input
          id="qty"
          type="number"
          min={1}
          max={10}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
          className="w-16 rounded-md border border-border px-2 py-1"
        />
      </div>
      <button
        type="button"
        disabled={!selected?.inStock}
        onClick={() => {
          if (!variantId) return;
          addToCart(variantId, qty);
          setAdded(true);
        }}
        className="rounded-full bg-accent text-white px-6 py-3 text-sm font-medium disabled:opacity-40"
      >
        Añadir al carrito
      </button>
      {added && (
        <p className="text-sm">
          Añadido. <a href="/carrito" className="underline">Ir al carrito</a>
        </p>
      )}
    </div>
  );
}
