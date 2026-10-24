export { proofSchema } from "@receipts/shared";
export type { Proof, ProofFor } from "@receipts/shared";

// present supports the merchant, missing means no such proof exists, contradicts supports the customer
export type ItemStatus = "present" | "missing" | "contradicts";
export type Decision = "DISPUTE" | "ACCEPT" | "ESCALATE";

// quote lists the exact strings the written reply must contain, it is not stored on the reply
export type ChecklistItem = { item: string; status: ItemStatus; value: string; quote: string[] };
export type ChecklistResult = { decision: Decision; rule: string; items: ChecklistItem[] };
