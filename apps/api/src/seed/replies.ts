import type { LlmClient } from "../llm/llm-client.js";
import type { CaseTemplate } from "./cases.js";

export function formatDollars(amountCents: number): string {
  return `$${(amountCents / 100).toFixed(2)}`;
}

export function buildReplyPrompt(template: CaseTemplate): string {
  return [
    "you are a merchant selling digital products. a customer opened a card dispute. write the reply you would send to the dispute reviewer.",
    `order reference: ${template.orderRef}`,
    `amount: ${formatDollars(template.amountCents)}`,
    `customer claim: ${template.claimText}`,
    `what your records show: ${template.facts.join("; ")}`,
    "write one reply of 80 to 150 words in plain prose. mention the order reference and the amount. do not use headings or bullet points.",
  ].join("\n");
}

// a reply must carry the exact order reference and the amount, with or without cents
export function passesFactCheck(text: string, template: CaseTemplate): boolean {
  const dollars = formatDollars(template.amountCents);
  const whole = dollars.replace(/\.00$/, "");
  const hasAmount = text.includes(dollars) || new RegExp(`${whole.replace("$", "\\$")}(?![\\d.])`).test(text);
  return hasAmount && text.includes(template.orderRef);
}

// one retry on an llm error or a failed fact check, then fail with the case key
export async function generateReply(llm: LlmClient, template: CaseTemplate): Promise<string> {
  const prompt = buildReplyPrompt(template);
  let lastProblem = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const text = await llm.complete(prompt);
      if (passesFactCheck(text, template)) return text;
      lastProblem = "reply failed the fact check";
    } catch (err) {
      lastProblem = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(`case ${template.key}: ${lastProblem}`);
}
