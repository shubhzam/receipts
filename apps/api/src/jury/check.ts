import type { CaseView } from "@receipts/shared";
import { formatDollars } from "../seed/replies.js";

// comprehension check asks for the disputed amount, the correct value never leaves the server
export function buildCheck(amountCents: number): CaseView["check"] {
  const values = [...new Set([amountCents, amountCents * 2, Math.round(amountCents / 2), amountCents + 1000])].sort(
    (a, b) => a - b,
  );
  return {
    prompt: "What amount is being disputed?",
    options: values.map((value) => ({ value: String(value), label: formatDollars(value) })),
  };
}

export function isCheckCorrect(amountCents: number, answer: string): boolean {
  return answer === String(amountCents);
}
