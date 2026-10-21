import type { OrderStatus } from "@prisma/client";

/** Customer-facing text. Each state only claims what the system has evidence for. */
export const ORDER_STATUS_TEXT: Record<OrderStatus, { label: string; detail: string }> = {
  PENDING_PAYMENT: { label: "Esperando confirmación del pago", detail: "Aún no hemos recibido la confirmación de la pasarela de pago." },
  PAYMENT_FAILED: { label: "Pago no completado", detail: "La pasarela indicó que el pago no se completó. No se ha cobrado nada." },
  PAID: { label: "Pago confirmado", detail: "Hemos recibido tu pago. Estamos preparando el envío del pedido al almacén." },
  SUPPLIER_QUEUED: { label: "Pago confirmado", detail: "Estamos enviando tu pedido al almacén." },
  SUPPLIER_ACCEPTED: { label: "En preparación", detail: "El almacén ha aceptado el pedido. Te avisaremos cuando tenga número de seguimiento." },
  SUPPLIER_REJECTED: { label: "Incidencia en el pedido", detail: "Hay un problema con la preparación. Te contactaremos por email." },
  SHIPPED: { label: "Enviado", detail: "El transportista tiene tu pedido." },
  DELIVERED: { label: "Entregado", detail: "El transportista ha confirmado la entrega." },
  CANCELLED: { label: "Cancelado", detail: "Este pedido se ha cancelado." },
  REFUNDED: { label: "Reembolsado", detail: "Hemos reembolsado el importe." },
};
