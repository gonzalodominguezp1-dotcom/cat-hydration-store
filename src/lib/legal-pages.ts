import { site } from "./site";

/**
 * DRAFT legal texts. They are a starting structure, not legal advice, and
 * must be reviewed by a professional before the store is published.
 */
export const LEGAL_PAGES: Record<string, { title: string; sections: { h: string; p: string[] }[] }> = {
  "aviso-legal": {
    title: "Aviso legal",
    sections: [
      { h: "Titular del sitio", p: [`${site.seller.legalName}, ${site.seller.taxId}, ${site.seller.address}. Email: ${site.supportEmail}.`] },
      { h: "Objeto", p: ["Este sitio ofrece la venta a distancia de productos para mascotas a consumidores."] },
    ],
  },
  condiciones: {
    title: "Condiciones de venta",
    sections: [
      { h: "Precios", p: ["Los precios incluyen IVA. Los gastos de envío se muestran antes del pago."] },
      { h: "Proceso de compra", p: ["El contrato se perfecciona cuando la pasarela confirma el pago y te enviamos la confirmación por email."] },
      { h: "Entrega", p: ["Los plazos de entrega se indicarán en cuanto estén confirmados con el almacén logístico."] },
      { h: "Derecho de desistimiento", p: ["Dispones de 14 días naturales desde la recepción para desistir sin justificación, conforme a la normativa de consumidores."] },
    ],
  },
  devoluciones: {
    title: "Devoluciones y garantía",
    sections: [
      { h: "Desistimiento", p: ["Escríbenos indicando tu número de pedido dentro de los 14 días siguientes a la entrega. Te reembolsaremos el importe, incluido el envío estándar, en un máximo de 14 días desde que nos comuniques el desistimiento, pudiendo retenerlo hasta recibir el producto."] },
      { h: "Garantía legal", p: ["Los productos nuevos tienen una garantía legal de conformidad de 3 años en España."] },
      { h: "Productos defectuosos", p: ["Si el producto llega dañado o no funciona, contáctanos con fotos o un vídeo y lo resolvemos sin coste para ti."] },
    ],
  },
  envios: {
    title: "Envíos",
    sections: [{ h: "Zonas", p: ["Actualmente enviamos a España peninsular. Próximamente Alemania, Países Bajos y Bélgica."] }],
  },
  privacidad: {
    title: "Política de privacidad",
    sections: [
      { h: "Responsable", p: [`${site.seller.legalName} (${site.supportEmail}).`] },
      { h: "Datos y finalidad", p: ["Tratamos nombre, email, dirección y teléfono para gestionar tu pedido, el envío y la atención al cliente. Base jurídica: ejecución del contrato."] },
      { h: "Encargados", p: ["Pasarela de pago, almacén logístico y transportista, solo con los datos necesarios para su función."] },
      { h: "Derechos", p: ["Puedes ejercer acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo al email indicado, y reclamar ante la AEPD."] },
    ],
  },
  cookies: {
    title: "Política de cookies",
    sections: [{ h: "Cookies utilizadas", p: ["Este sitio solo usa almacenamiento técnico necesario (carrito). No usamos cookies de analítica ni publicidad; si las añadimos, pediremos tu consentimiento antes."] }],
  },
};
