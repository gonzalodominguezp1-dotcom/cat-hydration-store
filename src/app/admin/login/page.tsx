"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";

export default function AdminLogin() {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-xl font-semibold">Acceso administración</h1>
      <form action={action} className="mt-6 grid gap-3 text-sm">
        <input name="email" type="email" required placeholder="Email" autoComplete="username" className="rounded-md border border-border px-3 py-2" />
        <input name="password" type="password" required placeholder="Contraseña" autoComplete="current-password" className="rounded-md border border-border px-3 py-2" />
        {state?.error && <p className="text-red-700">{state.error}</p>}
        <button disabled={pending} className="rounded-full bg-accent text-white px-5 py-2.5 font-medium">Entrar</button>
      </form>
    </div>
  );
}
