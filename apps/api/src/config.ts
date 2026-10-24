import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().min(1).default("*"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  WHOP_API_KEY: z.string().min(1),
  WHOP_BASE_URL: z.string().min(1),
  WHOP_API_VERSION_DATE: z.string().min(1),
  // empty until the sandbox webhook exists, checkout and the webhook refuse to run while they are empty
  WHOP_ACCOUNT_ID: z.string().default(""),
  WHOP_WEBHOOK_SECRET: z.string().default(""),
  DISPUTE_PACK_PRICE_CENTS: z.coerce.number().int().positive().default(2900),
  PREVIEW_RATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().default(20),
  REPLY_TARGET_WORDS: z.coerce.number().int().positive().default(120),
  TERAC_API_KEY: z.string().min(1),
  EXA_API_KEY: z.string().min(1),
  SOLARI_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  PUBLIC_WEB_URL: z.string().min(1),
  TERAC_CALLBACK_URL: z.string().min(1).default("https://terac.com/api/external/callback"),
  LLM_MODEL: z.string().min(1).default("claude-sonnet-5-5"),
  JURY_PARTICIPANTS: z.coerce.number().int().positive().default(7),
  JURY_CASES_PER_PARTICIPANT: z.coerce.number().int().positive().default(4),
});

export class Config {
  readonly port: number;
  readonly corsOrigin: string;
  readonly databaseUrl: string;
  readonly redisUrl: string;
  readonly whopApiKey: string;
  readonly whopBaseUrl: string;
  readonly whopApiVersionDate: string;
  readonly whopAccountId: string;
  readonly whopWebhookSecret: string;
  readonly disputePackPriceCents: number;
  readonly previewRateLimitPerHour: number;
  readonly replyTargetWords: number;
  readonly teracApiKey: string;
  readonly exaApiKey: string;
  readonly solariApiKey: string;
  readonly anthropicApiKey: string;
  readonly publicWebUrl: string;
  readonly teracCallbackUrl: string;
  readonly llmModel: string;
  readonly juryParticipants: number;
  readonly juryCasesPerParticipant: number;

  private constructor(env: z.infer<typeof envSchema>) {
    this.port = env.PORT;
    this.corsOrigin = env.CORS_ORIGIN;
    this.databaseUrl = env.DATABASE_URL;
    this.redisUrl = env.REDIS_URL;
    this.whopApiKey = env.WHOP_API_KEY;
    this.whopBaseUrl = env.WHOP_BASE_URL;
    this.whopApiVersionDate = env.WHOP_API_VERSION_DATE;
    this.whopAccountId = env.WHOP_ACCOUNT_ID;
    this.whopWebhookSecret = env.WHOP_WEBHOOK_SECRET;
    this.disputePackPriceCents = env.DISPUTE_PACK_PRICE_CENTS;
    this.previewRateLimitPerHour = env.PREVIEW_RATE_LIMIT_PER_HOUR;
    this.replyTargetWords = env.REPLY_TARGET_WORDS;
    this.teracApiKey = env.TERAC_API_KEY;
    this.exaApiKey = env.EXA_API_KEY;
    this.solariApiKey = env.SOLARI_API_KEY;
    this.anthropicApiKey = env.ANTHROPIC_API_KEY;
    this.publicWebUrl = env.PUBLIC_WEB_URL;
    this.teracCallbackUrl = env.TERAC_CALLBACK_URL;
    this.llmModel = env.LLM_MODEL;
    this.juryParticipants = env.JURY_PARTICIPANTS;
    this.juryCasesPerParticipant = env.JURY_CASES_PER_PARTICIPANT;
  }

  // exits with the offending key names, never the values
  static load(source: NodeJS.ProcessEnv = process.env): Config {
    const parsed = envSchema.safeParse(source);
    if (!parsed.success) {
      const keys = [...new Set(parsed.error.issues.map((issue) => issue.path.join(".")))];
      console.error(`missing or invalid env keys: ${keys.join(", ")}`);
      process.exit(1);
    }
    return new Config(parsed.data);
  }
}

export const config = Config.load();
