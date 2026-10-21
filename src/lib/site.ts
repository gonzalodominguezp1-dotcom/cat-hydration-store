/**
 * Store identity. The brand name is PROVISIONAL and the seller details must be
 * completed with real company data before launch (LSSI / Impressum).
 */
export const site = {
  name: "Fuente Felina",
  provisionalName: true,
  tagline: "Fuentes para gatos y sus recambios, explicadas con claridad",
  url: process.env.APP_URL ?? "http://localhost:3000",
  locale: "es-ES",
  supportEmail: "soporte@example.com",
  seller: {
    legalName: "[PENDIENTE: razón social]",
    taxId: "[PENDIENTE: NIF]",
    address: "[PENDIENTE: domicilio]",
  },
};
