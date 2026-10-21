import { expect, test } from "@playwright/test";

/**
 * Full purchase in test mode: simulated payment gateway + simulated supplier.
 * Requires the app (`pnpm build && pnpm start`) with seeded data and synced
 * stock, and the worker (`pnpm worker`) running.
 */
test("customer buys a fountain and the order reaches the supplier", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.goto("/productos/fuente-acero-2-5-l");
  await page.getByRole("button", { name: "Añadir al carrito" }).click();
  await page.getByRole("link", { name: "Ir al carrito" }).click();

  await expect(page.getByText("Total (IVA incluido)")).toBeVisible();
  await expect(page.getByText("43,85")).toBeVisible();

  await page.getByPlaceholder("Email").fill("e2e@example.com");
  await page.getByPlaceholder("Nombre y apellidos").fill("Cliente E2E");
  await page.getByPlaceholder("Dirección").fill("Calle Prueba 1");
  await page.getByPlaceholder("Código postal").fill("28001");
  await page.getByPlaceholder("Ciudad").fill("Madrid");
  await page.locator('input[name="acceptTerms"]').check();
  await page.getByRole("button", { name: /Pagar/ }).click();

  await expect(page.getByRole("heading", { name: "Esperando confirmación del pago" })).toBeVisible();
  await page.getByRole("button", { name: "Simular pago correcto" }).click();
  await expect(page.getByRole("heading", { name: "Pago confirmado" })).toBeVisible();

  // The worker sends the order to the (simulated) supplier.
  await expect(async () => {
    await page.reload();
    await expect(page.getByRole("heading", { name: "En preparación" })).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 20_000 });
});

test("admin area requires login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByPlaceholder("Email").fill(process.env.ADMIN_EMAIL ?? "admin@example.com");
  await page.getByPlaceholder("Contraseña").fill(process.env.ADMIN_PASSWORD ?? "dev-password-123456");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Ventas · últimos 30 días")).toBeVisible();
  await page.goto("/admin/finanzas");
  await expect(page.getByText("ROAS de equilibrio (con IVA)")).toBeVisible();
});
