"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearCart } from "@/lib/cart";

export function OrderClientActions(props: { orderId: string; token: string; pending: boolean; paid: boolean; fakeMode: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (props.paid) clearCart();
  }, [props.paid]);

  // While waiting for the webhook, refresh a few times.
  useEffect(() => {
    if (!props.pending || props.fakeMode) return;
    let n = 0;
    const id = setInterval(() => {
      if (++n > 10) clearInterval(id);
      router.refresh();
    }, 3000);
    return () => clearInterval(id);
  }, [props.pending, props.fakeMode, router]);

  if (!props.fakeMode || !props.pending) return null;

  async function simulate(outcome: "paid" | "failed") {
    setBusy(true);
    await fetch("/api/webhooks/fake", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId: props.orderId, token: props.token, outcome }),
    });
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="mt-6 rounded-xl border border-dashed border-amber-500 bg-amber-50 p-4 text-sm">
      <p className="font-medium">Modo pruebas: pasarela simulada</p>
      <p className="mt-1 text-muted">No hay claves de Stripe configuradas. Simula la respuesta de la pasarela:</p>
      <div className="mt-3 flex gap-2">
        <button disabled={busy} onClick={() => simulate("paid")} className="rounded-full bg-accent text-white px-4 py-2">Simular pago correcto</button>
        <button disabled={busy} onClick={() => simulate("failed")} className="rounded-full border border-border px-4 py-2">Simular pago fallido</button>
      </div>
    </div>
  );
}
