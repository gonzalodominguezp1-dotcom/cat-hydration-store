/**
 * Contract every supplier integration implements. The rest of the system only
 * talks to suppliers through this interface, so adding a supplier means adding
 * one adapter, not changing order, inventory or tracking logic.
 */

export interface SupplierProduct {
  supplierSku: string;
  name: string;
  costCents: number;
  /** Shipping cost charged by the supplier to the given country. */
  shippingCents: number;
  stock: number;
  ean?: string;
}

export interface SupplierStock {
  supplierSku: string;
  stock: number;
  costCents: number;
  shippingCents: number;
}

export interface SupplierOrderRequest {
  /** Our order number, used by the supplier as reference and for idempotency. */
  reference: string;
  shipTo: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string | null;
    postalCode: string;
    city: string;
    country: string;
    phone?: string | null;
    email: string;
  };
  lines: { supplierSku: string; quantity: number }[];
}

export type SupplierOrderResult =
  | { status: "accepted"; externalId: string }
  | { status: "rejected"; reason: string }
  /** Temporary failure: safe to retry. */
  | { status: "retry"; reason: string };

export interface TrackingInfo {
  externalId: string;
  status: "pending" | "shipped" | "in_transit" | "delivered" | "exception";
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  events: { at: string; description: string }[];
}

export interface SupplierAdapter {
  readonly key: string;
  /** True when this adapter does not talk to a real supplier. */
  readonly simulated: boolean;
  fetchCatalog(country: string): Promise<SupplierProduct[]>;
  fetchStock(skus: string[], country: string): Promise<SupplierStock[]>;
  submitOrder(req: SupplierOrderRequest): Promise<SupplierOrderResult>;
  /** Must return the existing order if `reference` was already submitted. */
  findOrderByReference(reference: string): Promise<{ externalId: string } | null>;
  getTracking(externalId: string): Promise<TrackingInfo>;
  /** Returns whether the supplier accepted a return authorisation request. */
  requestReturn(externalId: string, reason: string): Promise<{ accepted: boolean; rma?: string; note?: string }>;
}
