import Anthropic from "@anthropic-ai/sdk";
import type { LlmClient } from "./llm-client.js";

const REQUEST_TIMEOUT_MS = 120_000;
// the model thinks before it writes, so the cap has to cover thinking plus the reply
const MAX_OUTPUT_TOKENS = 4000;

export class AnthropicLlmClient implements LlmClient {
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    readonly model: string,
  ) {
    this.client = new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: 0 });
  }

  async complete(prompt: string): Promise<string> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: MAX_OUTPUT_TOKENS,
      messages: [{ role: "user", content: prompt }],
    });
    return message.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim();
  }
}
