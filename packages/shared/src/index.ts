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

export const assignmentResponseSchema = z.object({ caseKey: z.string() });
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
  merchantWins: z.boolean(),
  confidence: z.number().int().min(1).max(7),
  weaknessTags: z.array(weaknessTagSchema),
  weaknessText: z.string().max(2000).optional(),
  checkAnswer: z.string().min(1),
});
export type VoteRequest = z.infer<typeof voteRequestSchema>;

export const voteResponseSchema = z.object({ redirectUrl: z.string() });
export type VoteResponse = z.infer<typeof voteResponseSchema>;
