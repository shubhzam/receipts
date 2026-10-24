import { z } from "zod";

const fraud = z.object({
  reason: z.literal("fraud"),
  purchaseEmail: z.string(),
  accountEmail: z.string(),
  purchaseCountry: z.string(),
  cardholderCountry: z.string(),
  loginsAfterPurchase: z.number().int(),
  loginDays: z.number().int(),
  loginsFromPurchaseSource: z.boolean(),
});

const notReceived = z.object({
  reason: z.literal("not_received"),
  deliveryEmail: z.string(),
  deliveryStatus: z.enum(["delivered", "bounced"]),
  deliveryAt: z.string(),
  accessEvents: z.number().int(),
  accessWindowMinutes: z.number().int().nullable(),
});

const notAsDescribed = z.object({
  reason: z.literal("not_as_described"),
  listed: z.string(),
  delivered: z.string(),
  descriptionMatches: z.boolean(),
  mismatchEvidence: z.string().nullable(),
  mismatchQuote: z.array(z.string()),
  usageSummary: z.string().nullable(),
  usageQuote: z.array(z.string()),
});

const subscriptionCanceled = z.object({
  reason: z.literal("subscription_canceled"),
  policyShown: z.boolean(),
  policyText: z.string(),
  chargeAt: z.string(),
  cancelRequestAt: z.string(),
  cancelConfirmationAt: z.string().nullable(),
});

const duplicate = z.object({
  reason: z.literal("duplicate"),
  chargedOn: z.string(),
  orderIds: z.tuple([z.string(), z.string()]),
  products: z.tuple([z.string(), z.string()]),
});

const creditNotProcessed = z.object({
  reason: z.literal("credit_not_processed"),
  policyShown: z.boolean(),
  windowDays: z.number().int(),
  requestedOn: z.string(),
  dayOfRequest: z.number().int(),
  requestDeclined: z.boolean(),
  refundIssued: z.boolean(),
});

export const proofSchema = z.discriminatedUnion("reason", [
  fraud,
  notReceived,
  notAsDescribed,
  subscriptionCanceled,
  duplicate,
  creditNotProcessed,
]);

export type Proof = z.infer<typeof proofSchema>;
export type ProofFor<R extends Proof["reason"]> = Extract<Proof, { reason: R }>;

// present supports the merchant, missing means no such proof exists, contradicts supports the customer
export type ItemStatus = "present" | "missing" | "contradicts";
export type Decision = "DISPUTE" | "ACCEPT" | "ESCALATE";

// quote lists the exact strings the written reply must contain, it is not stored on the reply
export type ChecklistItem = { item: string; status: ItemStatus; value: string; quote: string[] };
export type ChecklistResult = { decision: Decision; rule: string; items: ChecklistItem[] };
