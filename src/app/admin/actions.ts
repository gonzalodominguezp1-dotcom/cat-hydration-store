"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { login, logout, requireAdmin } from "@/server/admin/auth";
import { db } from "@/server/db";
import { syncInventory } from "@/server/suppliers/inventory-sync-service";
import { refundOrder } from "@/server/payments/refund-service";
import { monthlyModelInputSchema } from "@/lib/finance/monthly-model";
import { enqueueJob } from "@/server/jobs/queue";
import { transitionOrder } from "@/server/orders/transition";

export async function loginAction(_: unknown, form: FormData) {
  const ok = await login(String(form.get("email") ?? ""), String(form.get("password") ?? ""));
  if (!ok) return { error: "Credenciales no válidas o demasiados intentos." };
  redirect("/admin");
}

export async function logoutAction() {
  await logout();
  redirect("/admin/login");
}

export async function saveScenarioAction(form: FormData) {
  await requireAdmin();
  const key = z.enum(["conservative", "base", "optimistic"]).parse(form.get("key"));
  const n = (name: string) => Number(String(form.get(name) ?? "").replace(",", "."));
  const params = monthlyModelInputSchema.parse({
    unit: {
      priceGross: n("priceGross"),
      vatRate: n("vatRate") / 100,
      productCost: n("productCost"),
      shippingCost: n("shippingCost"),
      paymentFeePct: n("paymentFeePct") / 100,
      paymentFeeFixed: n("paymentFeeFixed"),
      returnsProvisionPct: n("returnsProvisionPct") / 100,
      otherVariableCost: n("otherVariableCost"),
      cac: n("cac"),
    },
    ordersPerMonth: n("ordersPerMonth"),
    repeatOrdersPerMonth: n("repeatOrdersPerMonth"),
    repeatContribution: n("repeatContribution"),
    fixedCostsMonthly: n("fixedCostsMonthly"),
    cashGapDays: n("cashGapDays"),
  });
  await db.financeScenario.upsert({ where: { key }, create: { key, params }, update: { params } });
  revalidatePath("/admin/finanzas");
}

export async function syncSupplierAction(form: FormData) {
  await requireAdmin();
  await syncInventory(z.string().parse(form.get("supplierId")));
  revalidatePath("/admin/proveedores");
}

export async function refundAction(form: FormData) {
  await requireAdmin();
  const orderId = z.string().parse(form.get("orderId"));
  const euros = z.coerce.number().positive().parse(form.get("amount"));
  await refundOrder(orderId, Math.round(euros * 100), String(form.get("reason") ?? "Reembolso manual"));
  revalidatePath("/admin/pedidos");
}

export async function retrySupplierAction(form: FormData) {
  await requireAdmin();
  const orderId = z.string().parse(form.get("orderId"));
  await db.supplierOrder.updateMany({ where: { orderId, status: "REJECTED" }, data: { status: "PENDING" } });
  if (await transitionOrder(orderId, "SUPPLIER_REJECTED", "SUPPLIER_QUEUED", "Reintento manual desde el panel")) {
    await enqueueJob("supplier.submit_order", { orderId });
  }
  revalidatePath("/admin/pedidos");
}

export async function resolveIncidentAction(form: FormData) {
  await requireAdmin();
  await db.incident.update({ where: { id: z.string().parse(form.get("id")) }, data: { resolvedAt: new Date() } });
  revalidatePath("/admin");
}
