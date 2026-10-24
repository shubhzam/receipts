import { randomBytes } from "node:crypto";
import type { CreateOrderResponse, Intake, OrderResponse, Preview } from "@receipts/shared";
import { buildChecklist } from "../checklist/index.js";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { HttpError } from "../jury/errors.js";
import { reasonLabels } from "../seed/cases.js";
import { formatDollars } from "../seed/replies.js";
import { recordEvent } from "./events.js";

const TOKEN_BYTES = 18;

export function newToken(): string {
  return `rcp_${randomBytes(TOKEN_BYTES).toString("base64url")}`;
}

// the free preview is the checklist only, quotes stay internal
export function previewFor(intake: Intake): Preview {
  const checklist = buildChecklist({ proof: intake.proof });
  return {
    decision: checklist.decision,
    rule: checklist.rule,
    items: checklist.items.map(({ item, status, value }) => ({ item, status, value })),
  };
}

export async function createOrder(intake: Intake): Promise<CreateOrderResponse> {
  const preview = previewFor(intake);
  const token = newToken();
  const order = await prisma.order.create({
    data: { token, status: "draft", priceCents: config.disputePackPriceCents, intake, preview },
  });
  const label = reasonLabels[intake.proof.reason] ?? intake.proof.reason;
  await recordEvent(order.id, "intake_received", `received an intake for a ${label.toLowerCase()} dispute of ${formatDollars(intake.amountCents)}.`);
  await recordEvent(order.id, "preview_computed", `the checklist ran on the intake and the rule ${preview.rule} gave ${preview.decision}.`);
  return { token, preview };
}

export async function getOrderView(token: string): Promise<OrderResponse> {
  const order = await prisma.order.findUnique({ where: { token } });
  if (!order) throw new HttpError(404, "NOT_FOUND", "order not found");
  const status = order.status as OrderResponse["status"];
  const view: OrderResponse = { status, preview: order.preview as Preview };
  if (status === "fulfilled" && order.result) view.result = order.result as OrderResponse["result"];
  return view;
}
