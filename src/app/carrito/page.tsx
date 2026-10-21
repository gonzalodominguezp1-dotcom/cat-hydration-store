import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";

export const metadata: Metadata = { title: "Carrito", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Carrito</h1>
      <CartView />
    </div>
  );
}
