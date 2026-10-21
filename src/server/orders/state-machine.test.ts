import { describe, expect, it } from "vitest";
import { canTransition } from "./state-machine";

describe("order state machine", () => {
  it("only allows paid orders to reach the supplier", () => {
    expect(canTransition("PENDING_PAYMENT", "SUPPLIER_QUEUED")).toBe(false);
    expect(canTransition("PAYMENT_FAILED", "SUPPLIER_QUEUED")).toBe(false);
    expect(canTransition("PAID", "SUPPLIER_QUEUED")).toBe(true);
  });

  it("cannot mark delivered without shipping first", () => {
    expect(canTransition("SUPPLIER_ACCEPTED", "DELIVERED")).toBe(false);
    expect(canTransition("SHIPPED", "DELIVERED")).toBe(true);
  });

  it("refunded is terminal", () => {
    expect(canTransition("REFUNDED", "PAID")).toBe(false);
  });
});
