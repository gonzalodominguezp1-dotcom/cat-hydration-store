# IMPLEMENTATION_PLAN.md

Leyenda: ✅ hecho y probado · 🔜 siguiente · ⏸ bloqueado por una decisión o credencial de Gonzalo.

## Hecho (21/10/2026)

| Tarea | Verificación |
|---|---|
| ✅ Investigación de mercado, proveedores y modelo financiero | `docs/` |
| ✅ Modelo financiero, escenarios y reglas de decisión | 20 tests unitarios |
| ✅ Esquema de datos (Prisma) y migración inicial | `prisma migrate` |
| ✅ SupplierAdapter + adaptador simulado + 5 servicios | tests de integración |
| ✅ Cola persistente con reintentos y DEAD + incidencias | tests de integración |
| ✅ PaymentProvider: Stripe (modo test) + pasarela simulada firmada | tests de integración |
| ✅ Webhooks verificados e idempotentes, reembolsos | tests de integración |
| ✅ Tienda: inicio, ficha, carrito, checkout, confirmación, seguimiento, FAQ, contacto, guía, legales (borrador) | build + e2e |
| ✅ SEO técnico: metadatos, canonicals, Open Graph, JSON-LD Product/FAQ, sitemap, robots | build |
| ✅ Panel admin: ventas, incidencias, pedidos (reintento y reembolso), proveedores (sync), finanzas editables | e2e de login |
| ✅ Docker + docker-compose | — |

## Siguiente (no necesitan dinero)

1. 🔜 Probar Stripe en **modo test** real (necesito claves `sk_test_` y `whsec_` de una cuenta tuya; crear la cuenta es gratis).
2. 🔜 Emails transaccionales (confirmación de pedido y de envío) en modo desarrollo.
3. 🔜 Packs (un producto que combina varios SKU del proveedor).
4. 🔜 Recordatorio de filtros con consentimiento explícito (doble opt-in).
5. 🔜 Versión en alemán (i18n) preparada pero desactivada.
6. 🔜 Rate limiting, CSP, healthcheck y backups.

## Bloqueado por decisiones o credenciales tuyas

| Tarea | Qué necesito |
|---|---|
| ⏸ `BigBuyAdapter` real (sandbox) | Que contrates o pidas acceso de prueba a BigBuy (tiene coste mensual) o que me indiques otro proveedor |
| ⏸ Precios y fichas reales | Presupuestos del proveedor y muestras (compra de muestras) |
| ⏸ Fotos reales | Muestras |
| ⏸ Nombre de marca y dominio | Tu elección y compra del dominio |
| ⏸ Datos del vendedor y textos legales | Tu razón social/NIF y revisión de un profesional |
| ⏸ Despliegue público | Hosting (de pago) y tu aprobación para publicar |
| ⏸ Prueba de publicidad | Presupuesto aprobado (300–500 € sugeridos) |
| ⏸ Pedidos reales | `ALLOW_REAL_SUPPLIER_ORDERS=true` solo con tu autorización |
