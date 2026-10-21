# FINANCIAL_MODEL.md — Fase 3: modelo financiero y validación

Código: `src/lib/finance/` (con tests). Editable desde **/admin/finanzas**.
Todos los costes de proveedor, envío y CAC son **ESTIMACIONES** hasta tener presupuestos reales y una prueba pagada.

## 1. Variables

| Variable | Dónde |
|---|---|
| Precio con y sin IVA | `priceGross`, `vatRate` → `priceNet` |
| Coste neto del producto | `productCost` |
| Coste de envío | `shippingCost` |
| Comisiones de cobro | `paymentFeePct` + `paymentFeeFixed` (Stripe tarjeta EEE estándar: 1,5 % + 0,25 €; Bizum en Stripe: 1,5 % + 0,25 €) |
| Costes variables operativos | `otherVariableCost` (embalaje, atención) |
| Provisión de devoluciones y defectos | `returnsProvisionPct` (% del neto) |
| CAC | `cac` (combinado: gasto total en publicidad ÷ pedidos nuevos) |
| AOV | precio del pedido (pack) |
| Margen de contribución | neto − variables |
| ROAS de equilibrio | facturación con IVA ÷ contribución |
| Beneficio por pedido | contribución − CAC |
| Costes fijos | `fixedCostsMonthly` (hosting, dominio, plan del proveedor, gestoría) |
| Flujo de caja / capital circulante | salidas diarias (proveedor + publicidad) × días de desfase de cobro |

## 2. Escenarios por defecto (pack fuente + filtros, España)

Resultados calculados por el código (`pnpm test` los verifica):

| | Conservador | Base | Optimista |
|---|---|---|---|
| PVP con IVA | 49,90 € | 54,90 € | 59,90 € |
| Coste producto + envío | 19,00 € + 7,50 € | 17,00 € + 6,50 € | 15,00 € + 5,50 € |
| Provisión devoluciones | 8 % | 5 % | 4 % |
| Contribución antes de publicidad | **9,69 €** | **18,03 €** | **25,38 €** |
| ROAS de equilibrio (con IVA) | 5,15 | 3,04 | 2,36 |
| CAC supuesto | 35 € | 15 € | 12 € |
| Beneficio por pedido tras CAC | **−25,31 €** | **+3,03 €** | **+13,38 €** |
| Pedidos/mes | 30 | 80 (+10 recompras) | 200 (+40 recompras) |
| Costes fijos/mes | 250 € | 250 € | 400 € |
| **Resultado operativo/mes** | **−1.009 €** | **+52 €** | **+2.556 €** |
| Capital circulante (7 días) | 431 € | 719 € | 1.517 € |

Lectura:
- En el escenario **base** el negocio apenas cubre costes, y solo con un CAC combinado de 15 €. Eso exige que una parte importante de los pedidos llegue sin publicidad (SEO, contenido, recompra).
- Con un CAC solo de publicidad de 22 € en el pack base, cada pedido pierde dinero (lo comprueba un test).
- Un ROAS de 3 parece bueno, pero con una fuente sola el equilibrio está en ~3,6: **ROAS alto ≠ rentable**.

## 3. Criterios de decisión

Implementados en `evaluateAdTest()`. Los pedidos por euro gastado se modelan como un proceso de Poisson, así que el CAC tiene un **intervalo de confianza del 90 %**. Las reglas usan el intervalo, no la media.

| Decisión | Regla |
|---|---|
| **Lanzar una prueba** | Checklist previo: proveedor verificado con coste real; contribución antes de publicidad ≥ 12 €; checkout probado en modo test; textos legales revisados; fotos reales; presupuesto de prueba aprobado por Gonzalo |
| **Seguir recogiendo datos** | Gasto < 3 × CAC de equilibrio y sin señal clara |
| **Detener** | Incluso el CAC optimista del intervalo supera el CAC de equilibrio |
| **Optimizar** | El intervalo incluye el equilibrio (resultado ambiguo): cambiar creatividades, oferta o landing |
| **Candidato a escalar** | Incluso el CAC pesimista está por debajo del equilibrio y hay ≥ 10 pedidos. **Requiere aprobación manual**: el sistema nunca sube presupuesto solo |
| **Abandonar producto** | Presupuesto de prueba agotado sin llegar a "candidato a escalar" |

Ejemplo con CAC de equilibrio de 18 €: con 40 € gastados y 4 pedidos (CAC aparente 10 €) el sistema **no** recomienda escalar, porque 4 pedidos son muy pocos. Con 300 € y 40 pedidos, sí.

## 4. Presupuesto de validación sugerido (pendiente de tu aprobación)

Una sola prueba de Meta Ads en España: entre **300 y 500 €** en 2–3 semanas. Con un CAC de equilibrio de ~18 €, eso da 17–28 "CAC de equilibrio" de muestra, suficiente para que las reglas den una respuesta. No se activa sin tu autorización.
