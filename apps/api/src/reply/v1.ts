import type { ChecklistItem, Decision } from "../checklist/index.js";
import type { LlmClient } from "../llm/llm-client.js";
import { reasonLabels } from "../seed/cases.js";
import { formatDollars } from "../seed/replies.js";

const LENGTH_TOLERANCE = 0.15;

export type V1Input = {
  key: string;
  reason: string;
  amountCents: number;
  orderRef: string;
  claimText: string;
  decision: Decision;
  items: ChecklistItem[];
  v0Words: number;
};

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function wordRange(v0Words: number): { min: number; max: number } {
  return { min: Math.round(v0Words * (1 - LENGTH_TOLERANCE)), max: Math.round(v0Words * (1 + LENGTH_TOLERANCE)) };
}

const closings: Record<Decision, string> = {
  DISPUTE: "close by asking that the dispute be resolved in the merchant's favor.",
  ACCEPT: "state plainly that the merchant does not contest this dispute and say why, using only the items above. close by agreeing to refund the customer.",
  ESCALATE: "state that the proof is mixed and close by asking for a manual review of the dispute.",
};

// the writer sees the checklist items and the claim, never the case facts or the v0 reply
export function buildV1Prompt(input: V1Input, problems: string[] = []): string {
  const { min, max } = wordRange(input.v0Words);
  const lines = [
    "you are a merchant selling digital products. write your reply to a card dispute reviewer using only the verified proof items below. be truthful. do not add any fact, number, date or claim that is not listed.",
    `dispute reason: ${reasonLabels[input.reason] ?? input.reason}`,
    `order reference: ${input.orderRef}`,
    `amount: ${formatDollars(input.amountCents)}`,
    `customer claim: ${input.claimText}`,
    "verified proof items (present supports the merchant, missing means no such proof was found, contradicts supports the customer):",
    ...input.items.map((i) => `- ${i.item} [${i.status}]: ${i.value}`),
    `decision: ${input.decision}`,
    `write one reply of ${min} to ${max} words in plain prose, no headings, no bullet points.`,
    "the reply must name the dispute reason, the order reference and the amount.",
    "write one sentence for each present or contradicting item, quoting its value exactly as written, with every number, id, email, date and timestamp written exactly as given and numbers as digits.",
    "if a policy was shown to the customer before purchase, state it.",
    "write like a person, not a report: never mention the item names, the status words in brackets or the word item.",
    closings[input.decision],
  ];
  if (problems.length > 0) lines.push(`your previous reply was rejected for these problems, fix them: ${problems.join("; ")}`);
  return lines.join("\n");
}

function digitRuns(text: string): string[] {
  return text.match(/\d+/g) ?? [];
}

// every figure in the reply must come from the amount, the order ref or the items
export function checkV1(text: string, input: V1Input): string[] {
  const problems: string[] = [];
  const lower = text.toLowerCase();
  const dollars = formatDollars(input.amountCents);
  const whole = dollars.replace(/\.00$/, "");
  if (!text.includes(dollars) && !new RegExp(`${whole.replace("$", "\\$")}(?![\\d.])`).test(text)) {
    problems.push(`the amount ${dollars} is missing`);
  }
  if (!text.includes(input.orderRef)) problems.push(`the order reference ${input.orderRef} is missing`);
  for (const i of input.items) {
    if (lower.includes(i.item.toLowerCase())) problems.push(`the item name ${i.item} must not appear`);
    if (i.status === "missing") continue;
    for (const quote of i.quote) {
      if (!lower.includes(quote.toLowerCase())) problems.push(`"${quote}" from ${i.item} is missing`);
    }
  }
  const allowed = new Set(digitRuns([dollars, input.orderRef, ...input.items.flatMap((i) => [i.value, ...i.quote])].join(" ")));
  const extra = [...new Set(digitRuns(text).filter((n) => !allowed.has(n)))];
  if (extra.length > 0) problems.push(`numbers not in the items: ${extra.join(", ")}`);
  const { min, max } = wordRange(input.v0Words);
  const words = wordCount(text);
  if (words < min || words > max) problems.push(`${words} words, must be ${min} to ${max}`);
  return problems;
}

// one retry that carries the failed checks, then fail with the case key
export async function generateV1(llm: LlmClient, input: V1Input): Promise<string> {
  let problems: string[] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const text = await llm.complete(buildV1Prompt(input, problems));
      problems = checkV1(text, input);
      if (problems.length === 0) return text;
    } catch (err) {
      problems = [err instanceof Error ? err.message : String(err)];
    }
  }
  throw new Error(`case ${input.key}: v1 reply failed its checks: ${problems.join("; ")}`);
}
