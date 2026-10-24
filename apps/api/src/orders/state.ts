import type { OrderStatus } from "@receipts/shared";
import { HttpError } from "../jury/errors.js";
import { prisma } from "../db.js";

// anything not listed here is rejected
const transitions: Record<OrderStatus, OrderStatus[]> = {
  draft: ["pending_payment"],
  pending_payment: ["paid", "failed"],
  paid: ["fulfilled", "failed"],
  fulfilled: [],
  failed: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return transitions[from].includes(to);
}

type Fields = {
  whopCheckoutId?: string;
  whopPurchaseUrl?: string;
  whopPaymentId?: string;
  paidAt?: Date;
  fulfilledAt?: Date;
  result?: object;
};

// conditional update, only one caller wins when a webhook and a retry race, false means someone else already moved the order
export async function transition(orderId: string, from: OrderStatus, to: OrderStatus, fields: Fields = {}): Promise<boolean> {
  if (!canTransition(from, to)) throw new HttpError(500, "BAD_TRANSITION", `order cannot move from ${from} to ${to}`);
  const { count } = await prisma.order.updateMany({ where: { id: orderId, status: from }, data: { status: to, ...fields } });
  return count === 1;
}
