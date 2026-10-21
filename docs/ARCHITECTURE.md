# ARCHITECTURE.md

## Visión general

Un monolito modular en Next.js (web + API + panel) y un **worker** separado que procesa la cola. Ambos comparten PostgreSQL. Despliegue con Docker (`web` + `worker` + `db`).

```
Cliente ──► Next.js (tienda, /api, /admin) ──► PostgreSQL ◄── Worker (cola de trabajos)
                 │                                              │
                 └─► PaymentProvider (Stripe Checkout)          └─► SupplierAdapter (BigBuy, simulado…)
                          │
                          └─ webhook firmado ─► /api/webhooks/stripe
```

## Decisiones

| Decisión | Motivo |
|---|---|
| Next.js App Router + TS estricto + Tailwind | Pedido por Gonzalo; SSR para SEO; un solo despliegue |
| Prisma + PostgreSQL | Tipado de extremo a extremo; migraciones versionadas |
| Dinero en céntimos (`Int`) | Sin errores de coma flotante |
| Cola en Postgres (`FOR UPDATE SKIP LOCKED`) en vez de Redis | Una dependencia menos; transaccional con los pedidos; suficiente para miles de pedidos/día |
| Stripe primero | Sin cuota mensual; tarjetas EEE 1,5 % + 0,25 €; Bizum, iDEAL, Bancontact y Klarna disponibles; checkout alojado (sin datos de tarjeta en nuestros servidores). Mollie es la alternativa (Bizum desde tarifa de adquirente + 0,10 % + 0,10 €, Bancontact 1,40 % + 0,25 €). Redsys se descarta por ahora: requiere contrato con banco y no cubre iDEAL/Bancontact |
| Sesiones de admin en BD + bcrypt | Sin dependencia de proveedores externos; revocables |

## Flujo de pedido

```
Checkout (precios calculados en servidor, clave de idempotencia)
  → Order PENDING_PAYMENT + Payment PENDING
  → Stripe Checkout (página alojada)
  → webhook verificado (firma + importe + moneda)       ← única forma de llegar a PAID
  → en la MISMA transacción: WebhookEvent (único) + Order PAID + Job "supplier.submit_order" (dedupeKey)
  → worker: comprueba stock → busca pedido previo por referencia → envía al proveedor
      ├─ aceptado  → SUPPLIER_ACCEPTED → job de tracking cada 6 h
      ├─ rechazado → SUPPLIER_REJECTED + incidencia (reintento o reembolso manual)
      └─ temporal  → reintento con backoff exponencial; tras N intentos → DEAD + incidencia
  → tracking del proveedor con número y transportista → SHIPPED
  → proveedor informa entrega → DELIVERED
```

Máquina de estados en `src/server/orders/state-machine.ts`. Las transiciones son condicionales (`UPDATE … WHERE status IN (…)`) y quedan registradas en `OrderStatusEvent`.

## Garantías y dónde se prueban

| Garantía | Test |
|---|---|
| La redirección del navegador no marca el pedido como pagado | `tests/order-flow.test.ts` |
| Webhook con firma no válida → rechazado | ídem |
| Webhook duplicado (incluso concurrente) → se procesa una vez, un solo trabajo | ídem |
| Importe distinto → no se marca pagado, incidencia | ídem |
| Pago tras cancelación → incidencia para reembolsar | ídem |
| Pedido no pagado nunca llega al proveedor | ídem |
| Reenvío del mismo pedido al proveedor no lo duplica | ídem |
| Fallos temporales se reintentan; agotados → DEAD + alerta | ídem |
| Sin evidencia del proveedor no hay "enviado" ni "entregado" | ídem |
| Cambio de coste que deja margen negativo desactiva la variante | ídem |
| Compra completa en navegador | `e2e/purchase.spec.ts` |

## Seguridad

- Secretos solo por variables de entorno; `.env` fuera de git. Arranque bloqueado con `sk_live_` fuera de producción.
- Cabeceras básicas (`X-Frame-Options`, `nosniff`, `Referrer-Policy`) en middleware.
- Validación con Zod en todas las entradas públicas.
- Logs estructurados en JSON, sin datos de tarjeta ni contraseñas.

## Pendiente antes de producción

- Rate limiting compartido (login y seguimiento de pedidos) si hay más de una instancia.
- Backups automáticos de PostgreSQL y prueba de restauración.
- Monitorización (healthcheck, alertas de incidencias por email).
- Emails transaccionales (confirmación, envío) con un proveedor de email.
- Política de seguridad de contenido (CSP).
- Gestión de consentimiento si se añade analítica o píxeles publicitarios.
