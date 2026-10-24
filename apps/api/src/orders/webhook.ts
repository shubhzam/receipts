import { Router, raw, type NextFunction, type Request, type Response } from "express";
import { unwrapWebhook } from "@whop/sdk/helpers";
import { z } from "zod";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { recordEvent } from "./events.js";
import { enqueueFulfill } from "./queue.js";
import { transition } from "./state.js";

const money = z.object({ amount: z.string(), currency: z.string() }).nullish();

const paymentEventSchema = z.object({
  type: z.string(),
  data: z.object({
    id: z.string(),
    metadata: z.record(z.string(), z.unknown()).nullish(),
    total: money,
    usd_total: money,
  }),
});

// "29.00" to 2900, null when the string is not a plain decimal
export function moneyToCents(amount: string): number | null {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(amount.trim());
  if (!match) return null;
  const fraction = Math.round(Number(`0.${match[2] ?? "0"}`) * 100);
  return Number(match[1]) * 100 + fraction;
}

type PaymentData = z.infer<typeof paymentEventSchema>["data"];

// usd only, a charge in another currency cannot be compared to our price
export function paidCents(data: PaymentData): number | null {
  const paid = [data.usd_total, data.total].find((m) => m && m.currency.toLowerCase() === "usd");
  return paid ? moneyToCents(paid.amount) : null;
}

// a repeat attempt stays quiet on success, the job id already guarantees one job per order
async function enqueueAndRecord(orderId: string, repeat = false): Promise<void> {
  try {
    await enqueueFulfill(orderId);
    if (!repeat) await recordEvent(orderId, "job_queued", "queued the fulfillment job for this order.");
  } catch (err) {
    console.error(`enqueue failed for order ${orderId}: ${err instanceof Error ? err.message : err}`);
    await recordEvent(orderId, "job_queue_failed", "the queue was unreachable, the order stays paid and the next webhook retry will queue it again.");
  }
}

export async function handlePaymentSucceeded(data: PaymentData): Promise<void> {
  const orderId = typeof data.metadata?.orderId === "string" ? data.metadata.orderId : null;
  const order = orderId ? await prisma.order.findUnique({ where: { id: orderId } }) : null;
  if (!order) {
    await recordEvent(null, "payment_ignored", "a payment arrived for an order we do not know, nothing was changed.");
    return;
  }
  if (order.whopPaymentId === data.id) {
    // duplicate delivery, only a still-paid order gets another queue attempt and the job id makes that safe
    if (order.status === "paid") await enqueueAndRecord(order.id, true);
    return;
  }
  if (order.status !== "pending_payment") {
    await recordEvent(order.id, "payment_ignored", `a payment arrived while the order was ${order.status}, nothing was changed.`);
    return;
  }

  const cents = paidCents(data);
  if (cents === null || cents < order.priceCents) {
    await transition(order.id, "pending_payment", "failed", { whopPaymentId: data.id });
    await recordEvent(order.id, "payment_ignored", "the paid amount was missing or lower than the price, the order was marked failed.");
    return;
  }

  const won = await transition(order.id, "pending_payment", "paid", { whopPaymentId: data.id, paidAt: new Date() });
  if (!won) return;
  await recordEvent(order.id, "payment_confirmed", "the payment webhook passed its signature check and the paid amount matched the price.");
  await enqueueAndRecord(order.id);
}

function headerRecord(req: Request): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers[name] = value;
  }
  return headers;
}

export const webhookRouter = Router();

// raw body on purpose, the signature covers the exact bytes Whop sent
webhookRouter.post("/whop", raw({ type: "*/*", limit: "1mb" }), (req: Request, res: Response, next: NextFunction) => {
  void (async () => {
    if (!config.whopWebhookSecret) {
      res.status(503).json({ error: { code: "WEBHOOK_NOT_CONFIGURED", message: "webhook secret is not set" } });
      return;
    }
    let payload: unknown;
    try {
      payload = unwrapWebhook(Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "", {
        headers: headerRecord(req),
        key: config.whopWebhookSecret,
      });
    } catch {
      res.status(400).json({ error: { code: "BAD_SIGNATURE", message: "webhook signature check failed" } });
      return;
    }
    const parsed = paymentEventSchema.safeParse(payload);
    if (parsed.success && parsed.data.type === "payment.succeeded") await handlePaymentSucceeded(parsed.data.data);
    else if (!parsed.success && (payload as { type?: unknown })?.type === "payment.succeeded") {
      await recordEvent(null, "payment_ignored", "a payment event arrived in a shape we do not recognise, nothing was changed.");
    }
    res.status(200).json({ ok: true });
  })().catch(next);
});
