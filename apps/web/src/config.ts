import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().min(1),
  NEXT_PUBLIC_DISPUTE_PACK_PRICE_CENTS: z.coerce.number().int().positive().default(2900),
});

export class Config {
  readonly apiUrl: string;
  readonly priceCents: number;

  private constructor(env: z.infer<typeof envSchema>) {
    this.apiUrl = env.NEXT_PUBLIC_API_URL;
    this.priceCents = env.NEXT_PUBLIC_DISPUTE_PACK_PRICE_CENTS;
  }

  // next only inlines NEXT_PUBLIC_ vars referenced statically, so list them explicitly
  static load(): Config {
    const parsed = envSchema.safeParse({
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NEXT_PUBLIC_DISPUTE_PACK_PRICE_CENTS: process.env.NEXT_PUBLIC_DISPUTE_PACK_PRICE_CENTS,
    });
    if (!parsed.success) {
      const keys = [...new Set(parsed.error.issues.map((issue) => issue.path.join(".")))];
      throw new Error(`missing or invalid env keys: ${keys.join(", ")}`);
    }
    return new Config(parsed.data);
  }
}

export const config = Config.load();
