# SUPPLIER_RESEARCH.md — Fase 2: proveedores

Fecha de consulta: **21/10/2026**. Producto: fuentes para gatos, filtros de recambio y accesorios de limpieza.
Mercado inicial: España; después Alemania.

## 1. Resumen

- **Ningún proveedor está verificado todavía.** No he contactado a nadie ni he aceptado condiciones: eso requiere tu aprobación.
- El candidato técnico más sólido para empezar es **BigBuy** (España): tiene API REST documentada con sandbox para catálogo, pedidos, costes de envío y tracking. Falta confirmar que tenga fuentes y filtros con margen suficiente.
- Para producto de marca (Catit), el distribuidor en España es **Rolf C. Hagen España** (Silla, Valencia). Hay que preguntar si hace dropshipping a tiendas online nuevas.
- **vidaXL** tiene una API excelente pero su catálogo es de hogar y jardín. Encaja mal con este nicho.
- La tienda ya funciona con un **adaptador simulado** (`MockSupplierAdapter`), claramente marcado, hasta tener acceso real.

## 2. Clasificación

### Candidatos sin verificar (prioridad de contacto)

| # | Proveedor | Tipo | Hechos comprobados | Por confirmar | Fuente |
|---|---|---|---|---|---|
| 1 | **BigBuy** (Barcelona; almacenes según un tercero en Barcelona, Madrid, Valencia y Lyon) | Mayorista con dropshipping | +400.000 referencias, 24 categorías; preparación 24/48 h; envío urgente a toda Europa con seguimiento; API de catálogo, pedidos, costes de envío y tracking (REST JSON, sandbox); los packs Ecommerce y Marketplace incluyen API y CSV/XML; sin permanencia; productos con embalaje original de la marca | Si hay fuentes y filtros, a qué coste; plazos y coste de envío ES/DE; devoluciones y defectos; facturación (IVA); cuota real (89 €/mes + 89 € de alta según tercero; otro tercero dice 99 €/mes) | [bigbuy.eu API](https://www.bigbuy.eu/es/api_bigbuy.html), [packs](https://www.bigbuy.eu/es/packs-mayoristas.html), [entrega](https://www.bigbuy.eu/es/entrega-envio.html), [dodropshipping 05/08/2026](https://dodropshipping.com/bigbuy-pricing-plans/), [sellthetrend](https://www.sellthetrend.com/de/blog/die-30-besten-europaeischen-dropshipping-lieferanten-im-jahr-2025-um-ihr-geschaeft-auszubauen) |
| 2 | **Rolf C. Hagen España** (Av. Beniparrel 11, 46460 Silla, Valencia) | Fabricante/distribuidor (Catit, Dogit, Cat Love) | Aparece en un directorio con la etiqueta "Dropshipping"; distribuye Catit en España | Si hace dropshipping real a consumidor final, mínimos, precios a tienda, integración (probablemente manual o CSV) | [proveedores.com](https://proveedores.com/proveedores/rolf-c-hagen-espana/) |
| 3 | **Hertwill** | Plataforma con almacenes en UE y EE. UU. | Declara almacenes en Europa y categoría de mascotas; planes 24,99–49,99 €/mes; plan gratis de 10 pedidos/mes; integración orientada a Shopify | Ubicación de almacenes, plazos, API propia (no encontrada), si tiene fuentes | [Shopify App Store](https://apps.shopify.com/hertwill) |
| 4 | **Zoohurt** (probablemente Polonia) | Mayorista de mascotas | Integración de stock y precios vía Base.com | Si hace dropshipping, países, plazos; su web dio error | [base.com](https://base.com/de-DE/integrationen/zoohurt/) |

### Opciones de respaldo (más intermediarios o menos control)

| Proveedor | Motivo |
|---|---|
| Spocket / Syncee | Marketplaces de proveedores; sin API pública propia; Spocket sin packaging personalizado ([dodropshipping](https://dodropshipping.com/spocket-review/), [syncee.com/pricing](https://syncee.com/pricing)) |
| CJDropshipping (almacenes declarados en Berlín, Rotterdam, Varsovia) | Producto genérico; calidad y documentación GPSR/CE a comprobar con muestras |

### Descartados

| Proveedor | Motivo |
|---|---|
| vidaXL | API muy buena (sandbox, 1 req/s) y almacén en NL, pero catálogo de hogar/jardín; además cobra cuota por país y el dropshipper paga las devoluciones ([b2b.vidaxl.com](https://b2b.vidaxl.com/pages/177-drop-shipping-terms-and-conditions)). Se guarda para el nicho 2. |
| Proveedores de EE. UU. y Reino Unido (PetDropshipper, Lee Mar Pet, GoDropship, The Paws…) | Envío desde fuera de la UE: aduanas, plazos y el nuevo arancel de 3 € por paquete de bajo valor |
| AliExpress / DHgate | Plazos largos, sin operador responsable UE claro (GPSR), mala experiencia de cliente |
| eComZone | Su app ya no está disponible en el App Store de Shopify; sin información verificable |

## 3. Qué preguntar a cada proveedor (plantilla)

1. ¿Envían directamente al consumidor final, con albarán neutro o con nuestra marca?
2. Precio por unidad de fuentes y filtros; coste y plazo de envío a ES, DE, NL y BE.
3. Stock: ¿feed en tiempo real (API/CSV/SFTP)? ¿Cada cuánto se actualiza?
4. Pedidos: ¿API, EDI, CSV o manual? ¿Prepago o crédito? ¿Hay entorno de pruebas?
5. Tracking: ¿cuándo y cómo lo devuelven?
6. Devoluciones y productos defectuosos: ¿a dónde se devuelven y quién paga?
7. Documentación: declaración CE, ficha técnica, datos del fabricante y responsable UE (GPSR), RAEE.
8. Facturación: factura con IVA español, inversión del sujeto pasivo, etc.
9. ¿Acuerdo de nivel de servicio (plazo de preparación, % de errores)?

## 4. Arquitectura de integración (ya implementada)

```
SupplierAdapter (interfaz)          src/server/suppliers/types.ts
 ├─ MockSupplierAdapter [SIMULADO]  src/server/suppliers/mock-adapter.ts
 └─ BigBuyAdapter (pendiente de credenciales de sandbox)

SupplierCatalogService      catalog-service.ts            lista catálogo del proveedor vs lo publicado
InventorySyncService        inventory-sync-service.ts     stock y costes; registra cambios de precio; desactiva variantes con margen negativo
SupplierOrderService        supplier-order-service.ts     envía pedidos PAGADOS; sin duplicados; reintentos; rechazos con alerta
ShipmentTrackingService     shipment-tracking-service.ts  solo marca "enviado"/"entregado" con evidencia del proveedor
ReturnsService              returns-service.ts            solicita devolución al proveedor o abre incidencia manual
```

Añadir un proveedor = implementar `SupplierAdapter` y registrarlo. Nada más cambia.

Salvaguarda: un adaptador real no envía pedidos si `ALLOW_REAL_SUPPLIER_ORDERS` no es `"true"`. En ese caso se abre una incidencia.

## 5. Obligaciones que dependen del proveedor (requieren revisión profesional)

| Tema | Hecho comprobado | Fuente |
|---|---|---|
| RAEE Alemania | Una empresa extranjera no puede registrarse sola: necesita un representante autorizado con sede en Alemania | [stiftung ear](https://www.stiftung-ear.de/anleitungen/weee-nummer-beantragen-als-auslaendisches-unternehmen/) |
| Envases Alemania | Quien envía productos envasados a consumidores en Alemania debe registrarse en LUCID; los envases de envío siempre requieren participación en un sistema | [verpackungsregister.org](https://www.verpackungsregister.org/themen/versand-und-onlinehandel) |
| RAEE España | El productor financia la gestión de residuos (RD 110/2015); el detalle del registro y de los SCRAP está pendiente de revisar | [MITECO](https://www.miteco.gob.es/es/calidad-y-evaluacion-ambiental/temas/prevencion-y-gestion-residuos/flujos/aparatos-electr.html) |
| GPSR | Datos del fabricante, responsable UE y advertencias visibles en la ficha | [ecommercegermany.com](https://ecommercegermany.com/blog/gpsr-general-product-safety-regulation/) |

La pregunta clave para el abogado o la gestoría: **¿quién es el "productor" RAEE cuando revendemos una fuente de marca de un mayorista español?** La respuesta cambia los costes de entrar en Alemania.
