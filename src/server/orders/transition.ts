import type { OrderStatus, Prisma } from "@prisma/client";
import { db } from "../db";
import { canTransition, InvalidTransitionError } from "./state-machine";

type Tx = Prisma.TransactionClient;

/**
 * Moves an order to a new status only if it is still in `from`. The
 * conditional update makes concurrent workers or duplicated webhooks safe:
 * the second one sees count = 0 and does nothing.
 *
 * Returns true when this call performed the transition.
 */
export async function transitionOrder(
  orderId: string,
  from: OrderStatus | OrderStatus[],
  to: OrderStatus,
  reason: string,
  tx: Tx = db,
  extra: Prisma.OrderUpdateManyMutationInput = {},
): Promise<boolean> {
  const fromList = Array.isArray(from) ? from : [from];
  for (const f of fromList) if (!canTransition(f, to)) throw new InvalidTransitionError(f, to);

  const current = await tx.order.findUnique({ where: { id: orderId }, select: { status: true } });
  if (!current) throw new Error(`Order ${orderId} not found`);

  const res = await tx.order.updateMany({
    where: { id: orderId, status: { in: fromList } },
    data: { status: to, ...extra },
  });
  if (res.count === 0) return false;

  await tx.orderStatusEvent.create({ data: { orderId, from: current.status, to, reason } });
  return true;
}
