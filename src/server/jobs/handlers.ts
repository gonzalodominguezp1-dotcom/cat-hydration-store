import type { Job } from "@prisma/client";
import { z } from "zod";
import { submitSupplierOrder } from "../suppliers/supplier-order-service";
import { syncInventory } from "../suppliers/inventory-sync-service";
import { pollTracking } from "../suppliers/shipment-tracking-service";

const orderPayload = z.object({ orderId: z.string() });
const supplierPayload = z.object({ supplierId: z.string() });

export async function runJob(job: Job): Promise<void> {
  switch (job.type) {
    case "supplier.submit_order":
      return submitSupplierOrder(orderPayload.parse(job.payload).orderId);
    case "supplier.sync_inventory":
      await syncInventory(supplierPayload.parse(job.payload).supplierId);
      return;
    case "supplier.poll_tracking":
      return pollTracking(orderPayload.parse(job.payload).orderId);
    default:
      throw new Error(`Unknown job type ${job.type}`);
  }
}
