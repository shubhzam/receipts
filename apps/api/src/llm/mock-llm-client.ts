import type { LlmClient } from "./llm-client.js";

// offline stand-in, replies come from a queue or a fixed function so tests never hit the network
export class MockLlmClient implements LlmClient {
  readonly model = "mock";
  readonly prompts: string[] = [];

  constructor(private readonly reply: string[] | ((prompt: string) => string)) {}

  async complete(prompt: string): Promise<string> {
    this.prompts.push(prompt);
    if (typeof this.reply === "function") return this.reply(prompt);
    const next = this.reply.shift();
    if (next === undefined) throw new Error("mock llm has no more replies");
    return next;
  }
}
