import Anthropic from "@anthropic-ai/sdk";
import type { LlmClient } from "./llm-client.js";

const REQUEST_TIMEOUT_MS = 60_000;

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
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });
    return message.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim();
  }
}
