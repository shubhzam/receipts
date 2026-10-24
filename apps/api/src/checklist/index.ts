import { decide } from "./rules.js";
import { itemsFor } from "./strategies.js";
import { proofSchema, type ChecklistResult } from "./types.js";

export type { ChecklistItem, ChecklistResult, Decision, Proof } from "./types.js";

// factsJson carries the structured proof next to the prose facts used for v0
export function buildChecklist(factsJson: unknown): ChecklistResult {
  const proof = proofSchema.parse((factsJson as { proof?: unknown } | null)?.proof);
  const items = itemsFor(proof);
  return { ...decide(proof.reason, items), items };
}
