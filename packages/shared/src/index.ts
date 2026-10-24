import { z } from "zod";

// health response, shared by api and web
const checkSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  ms: z.number(),
});

export const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  checks: z.object({
    db: checkSchema,
    redis: checkSchema,
    whop: checkSchema,
  }),
});

export type HealthCheck = z.infer<typeof checkSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;

// jury api, shared by api and web
export const weaknessTags = [
  "no_proof_of_use",
  "reply_too_vague",
  "proof_does_not_match_claim",
  "policy_not_shown_before_purchase",
  "dates_or_amounts_dont_add_up",
  "tone",
  "nothing_weak",
] as const;

export const weaknessTagSchema = z.enum(weaknessTags);
export type WeaknessTag = z.infer<typeof weaknessTagSchema>;

export const errorResponseSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

export const assignmentRequestSchema = z.object({
  studyKey: z.string().min(1),
  teracSubmissionId: z.string().min(1),
  taskId: z.string().min(1).optional(),
});
export type AssignmentRequest = z.infer<typeof assignmentRequestSchema>;

// caseKeys is the ordered list this participant walks, answered lets a reopened link resume
export const assignmentResponseSchema = z.object({
  caseKeys: z.array(z.string()),
  answeredCaseKeys: z.array(z.string()),
  redirectUrl: z.string().nullable(),
});
export type AssignmentResponse = z.infer<typeof assignmentResponseSchema>;

export const caseViewSchema = z.object({
  caseKey: z.string(),
  reasonLabel: z.string(),
  amountCents: z.number().int(),
  claimText: z.string(),
  replyText: z.string(),
  check: z.object({
    prompt: z.string(),
    options: z.array(z.object({ value: z.string(), label: z.string() })),
  }),
});
export type CaseView = z.infer<typeof caseViewSchema>;

export const voteRequestSchema = z.object({
  studyKey: z.string().min(1),
  teracSubmissionId: z.string().min(1),
  caseKey: z.string().min(1),
  merchantWins: z.boolean(),
  confidence: z.number().int().min(1).max(7),
  weaknessTags: z.array(weaknessTagSchema),
  weaknessText: z.string().max(2000).optional(),
  checkAnswer: z.string().min(1),
});
export type VoteRequest = z.infer<typeof voteRequestSchema>;

// redirectUrl is only set once the last case of the assignment is answered
export const voteResponseSchema = z.object({
  answered: z.number().int(),
  total: z.number().int(),
  redirectUrl: z.string().nullable(),
});
export type VoteResponse = z.infer<typeof voteResponseSchema>;

// structured proof per dispute reason, the checklist runs on it and the intake form fills it
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


// order api, shared by api and web
export const orderStatuses = ["draft", "pending_payment", "paid", "fulfilled", "failed"] as const;
export const orderStatusSchema = z.enum(orderStatuses);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

// 13 to 19 digits in a row, or card-style groups of four, never stored
const CARD_LIKE = /\d{13,19}|\b(?:\d{4}[ -]){3}\d{1,7}\b/;

export function hasCardLikeDigits(value: unknown): boolean {
  if (typeof value === "string") return CARD_LIKE.test(value);
  if (typeof value === "number") return CARD_LIKE.test(String(value));
  if (Array.isArray(value)) return value.some(hasCardLikeDigits);
  if (value !== null && typeof value === "object") return Object.values(value).some(hasCardLikeDigits);
  return false;
}

export const CARD_DIGITS_MESSAGE = "remove any card number from the form, we never need one";

export const intakeSchema = z
  .object({
    orderRef: z.string().trim().min(1).max(60),
    amountCents: z.number().int().min(100).max(1_000_000),
    claimText: z.string().trim().min(1).max(1000),
    proof: proofSchema,
  })
  .refine((intake) => !hasCardLikeDigits(intake), { message: CARD_DIGITS_MESSAGE });
export type Intake = z.infer<typeof intakeSchema>;

export const itemStatusSchema = z.enum(["present", "missing", "contradicts"]);
export const decisionSchema = z.enum(["DISPUTE", "ACCEPT", "ESCALATE"]);

export const previewItemSchema = z.object({ item: z.string(), status: itemStatusSchema, value: z.string() });
export const previewSchema = z.object({
  decision: decisionSchema,
  rule: z.string(),
  items: z.array(previewItemSchema),
});
export type Preview = z.infer<typeof previewSchema>;

export const orderResultSchema = previewSchema.extend({ replyText: z.string() });
export type OrderResult = z.infer<typeof orderResultSchema>;

export const createOrderResponseSchema = z.object({ token: z.string(), preview: previewSchema });
export type CreateOrderResponse = z.infer<typeof createOrderResponseSchema>;

export const checkoutResponseSchema = z.object({ purchaseUrl: z.string() });
export type CheckoutResponse = z.infer<typeof checkoutResponseSchema>;

// result is only present once the order is fulfilled
export const orderResponseSchema = z.object({
  status: orderStatusSchema,
  preview: previewSchema,
  result: orderResultSchema.optional(),
});
export type OrderResponse = z.infer<typeof orderResponseSchema>;

export const agentSteps = [
  "intake_received",
  "preview_computed",
  "checkout_created",
  "payment_confirmed",
  "job_queued",
  "checklist_run",
  "reply_written",
  "fact_check_passed",
  "order_fulfilled",
  "payment_ignored",
  "job_queue_failed",
  "order_failed",
] as const;

// orderId is cut to its last eight characters so the public trail never shows a full handle
export const agentEventSchema = z.object({
  id: z.string(),
  orderId: z.string().nullable(),
  step: z.string(),
  reasoning: z.string(),
  createdAt: z.string(),
});
export type AgentEventView = z.infer<typeof agentEventSchema>;

export const eventsResponseSchema = z.object({ events: z.array(agentEventSchema) });
export type EventsResponse = z.infer<typeof eventsResponseSchema>;
