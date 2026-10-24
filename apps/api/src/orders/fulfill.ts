import type { Intake, OrderResult } from "@receipts/shared";
import { buildChecklist } from "../checklist/index.js";
import { config } from "../config.js";
import { prisma } from "../db.js";
import type { LlmClient } from "../llm/llm-client.js";
import { generateV1, wordCount } from "../reply/v1.js";
import { recordEvent } from "./events.js";
import { transition } from "./state.js";

// runs from the worker, safe to run again: a fulfilled order returns early and a failed one is left alone
export async function fulfillOrder(orderId: string, llm: LlmClient, finalAttempt: boolean): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error(`order ${orderId} not found`);
  if (order.status === "fulfilled" || order.status === "failed") return;
  if (order.status !== "paid") throw new Error(`order ${orderId} is ${order.status}, not paid yet`);

  try {
    const intake = order.intake as Intake;
    const checklist = buildChecklist({ proof: intake.proof });
    await recordEvent(order.id, "checklist_run", `the checklist ran again on the paid intake and the rule ${checklist.rule} gave ${checklist.decision}.`);

    const replyText = await generateV1(llm, {
      key: order.id,
      reason: intake.proof.reason,
      amountCents: intake.amountCents,
      orderRef: intake.orderRef,
      claimText: intake.claimText,
      decision: checklist.decision,
      items: checklist.items,
      v0Words: config.replyTargetWords,
    });
    await recordEvent(order.id, "reply_written", `the writer produced a reply of ${wordCount(replyText)} words.`);
    await recordEvent(order.id, "fact_check_passed", "every figure, id and date in the reply came from the checklist items.");

    const result: OrderResult = {
      decision: checklist.decision,
      rule: checklist.rule,
      items: checklist.items.map(({ item, status, value }) => ({ item, status, value })),
      replyText,
    };
    const moved = await transition(order.id, "paid", "fulfilled", { result, fulfilledAt: new Date() });
    if (moved) await recordEvent(order.id, "order_fulfilled", "stored the reply and marked the order fulfilled.");
  } catch (err) {
    if (finalAttempt) {
      await transition(order.id, "paid", "failed");
      await recordEvent(order.id, "order_failed", "the reply could not be written or failed its fact check on every attempt, the order was marked failed.");
    }
    throw err;
  }
}
