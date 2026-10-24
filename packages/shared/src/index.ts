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
