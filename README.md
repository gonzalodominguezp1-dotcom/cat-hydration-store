# Tienda de hidratación felina (nombre provisional: Fuente Felina)

Tienda propia (sin Shopify) para vender fuentes para gatos, filtros y accesorios por dropshipping desde proveedores de la UE.
La documentación de negocio está en `docs/`.

**Estado:** modo de pruebas. Pasarela de pago y proveedor **simulados**. No hay claves de producción ni pedidos reales.

## Stack

Next.js 15 (App Router) · TypeScript estricto · Tailwind CSS 4 · PostgreSQL · Prisma 6 · Zod · Vitest · Playwright · pnpm.

## Puesta en marcha

```bash
pnpm install
cp .env.example .env            # rellena DATABASE_URL y el admin
pnpm db:migrate                 # crea las tablas
pnpm db:seed                    # catálogo de ejemplo + usuario admin
pnpm sync:inventory             # carga stock del proveedor simulado
pnpm dev                        # http://localhost:3000
pnpm worker                     # en otra terminal: procesa la cola de pedidos
```

Con Docker: `docker compose up --build`.

## Pruebas

```bash
pnpm test        # unitarias (finanzas, estados) + integración con Postgres (pagos, webhooks, proveedor, cola)
pnpm test:e2e    # compra completa en navegador; requiere la app y el worker en marcha
```

Las pruebas de integración usan la base `shop_test` (variable `TEST_DATABASE_URL`) y la **reinician** en cada ejecución.

## Seguridad operativa

- Un pedido solo pasa a **PAGADO** por un webhook verificado (firma) y con el importe correcto. Nunca por la redirección del navegador.
- Cada evento de webhook se guarda en la misma transacción que sus efectos: los reintentos no duplican nada.
- Los pedidos al proveedor real están bloqueados salvo `ALLOW_REAL_SUPPLIER_ORDERS="true"` (requiere aprobación de Gonzalo).
- Claves `sk_live_` fuera de producción hacen fallar el arranque.
- No se almacenan datos de tarjeta (checkout alojado de Stripe).
- El panel `/admin` usa sesiones en BD (token aleatorio, guardado como hash, cookie httpOnly) y bcrypt.

## Estructura

```
src/lib/finance        Modelo financiero, escenarios y reglas de decisión (puro, testeado)
src/server/suppliers   SupplierAdapter + servicios de catálogo, stock, pedidos, tracking y devoluciones
src/server/payments    PaymentProvider (Stripe, simulado), webhooks idempotentes, reembolsos
src/server/jobs        Cola persistente en Postgres (SKIP LOCKED) y worker
src/server/orders      Máquina de estados del pedido
src/app                Tienda y panel de administración
```
