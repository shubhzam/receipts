export interface LlmClient {
  readonly model: string;
  complete(prompt: string): Promise<string>;
}
