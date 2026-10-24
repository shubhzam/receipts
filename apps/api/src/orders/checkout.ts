import type { CheckoutResponse, Preview } from "@receipts/shared";
import { prisma } from "../db.js";
import { HttpError } from "../jury/errors.js";
import { recordEvent } from "./events.js";
import { transition } from "./state.js";
import { createCheckout } from "./whop.js";

export async function startCheckout(token: string): Promise<CheckoutResponse> {
  const order = await prisma.order.findUnique({ where: { token } });
  if (!order) throw new HttpError(404, "NOT_FOUND", "order not found");
  const preview = order.preview as Preview;
  if (preview.decision === "ACCEPT") {
    throw new HttpError(409, "NO_CHECKOUT", "the proof is too thin to win this dispute, we recommend accepting it");
  }
  if (order.status === "pending_payment" && order.whopPurchaseUrl) return { purchaseUrl: order.whopPurchaseUrl };
  if (order.status !== "draft") throw new HttpError(409, "ALREADY_PAID", "this order can no longer be paid for");

  const checkout = await createCheckout(order);
  const moved = await transition(order.id, "draft", "pending_payment", {
    whopCheckoutId: checkout.checkoutId,
    whopPurchaseUrl: checkout.purchaseUrl,
  });
  if (moved) {
    await recordEvent(order.id, "checkout_created", "created a sandbox checkout for the dispute reply pack and waited for the payment webhook.");
    return { purchaseUrl: checkout.purchaseUrl };
  }
  // a parallel call won the move, the idempotency key means it holds the same checkout
  const current = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  if (current.status === "pending_payment" && current.whopPurchaseUrl) return { purchaseUrl: current.whopPurchaseUrl };
  throw new HttpError(409, "ALREADY_PAID", "this order can no longer be paid for");
}
