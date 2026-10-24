import { WhopClient } from "@whop/sdk";
import { config } from "../config.js";
import { HttpError } from "../jury/errors.js";

const whop = new WhopClient({
  token: config.whopApiKey,
  baseUrl: config.whopBaseUrl,
  apiVersionDate: config.whopApiVersionDate,
});

const PLAN_TITLE = "Dispute reply pack";

export type Checkout = { checkoutId: string; purchaseUrl: string };

// the order id is the idempotency key, so a retried call returns the same checkout
export async function createCheckout(order: { id: string; token: string; priceCents: number }): Promise<Checkout> {
  if (!config.whopAccountId) throw new HttpError(503, "CHECKOUT_NOT_CONFIGURED", "checkout is not configured yet");
  const created = await whop.checkoutConfigurations.create(
    {
      account_id: config.whopAccountId,
      plan: {
        plan_type: "one_time",
        initial_price: order.priceCents / 100,
        currency: "usd",
        title: PLAN_TITLE,
      },
      metadata: { orderId: order.id },
      redirect_url: `${config.publicWebUrl}/r/${order.token}`,
    },
    { headers: { "Idempotency-Key": order.id } },
  );
  if (!created.purchase_url) throw new HttpError(502, "CHECKOUT_FAILED", "the payment provider returned no checkout url");
  return { checkoutId: created.id, purchaseUrl: created.purchase_url };
}
