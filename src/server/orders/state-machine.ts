import type { OrderStatus } from "@prisma/client";

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["PAID", "PAYMENT_FAILED", "CANCELLED"],
  PAYMENT_FAILED: ["PAID", "CANCELLED"],
  PAID: ["SUPPLIER_QUEUED", "CANCELLED", "REFUNDED"],
  SUPPLIER_QUEUED: ["SUPPLIER_ACCEPTED", "SUPPLIER_REJECTED"],
  SUPPLIER_REJECTED: ["SUPPLIER_QUEUED", "CANCELLED", "REFUNDED"],
  SUPPLIER_ACCEPTED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: ["REFUNDED"],
  REFUNDED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export class InvalidTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Invalid order transition ${from} → ${to}`);
  }
}
