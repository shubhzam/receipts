import type { ChecklistItem, Decision, ItemStatus, Proof } from "./types.js";

type Rule = { name: string; decision: Decision; when: (status: (item: string) => ItemStatus | undefined) => boolean };

// ordered per reason, the first rule that holds fires, nothing holding means escalate
const rulesByReason: Record<Proof["reason"], Rule[]> = {
  fraud: [
    { name: "fraud_all_three_hold", decision: "DISPUTE", when: (s) => s("email_match") === "present" && s("access_after_purchase") === "present" && s("country_match") === "present" },
    { name: "fraud_email_and_country_differ_no_access", decision: "ACCEPT", when: (s) => s("email_match") === "contradicts" && s("country_match") === "contradicts" && s("access_after_purchase") === "missing" },
  ],
  not_received: [
    { name: "not_received_delivered_and_accessed", decision: "DISPUTE", when: (s) => s("delivery_email") === "present" && s("access_logged") === "present" },
    { name: "not_received_bounced_no_access", decision: "ACCEPT", when: (s) => s("delivery_email") === "contradicts" && s("access_logged") === "missing" },
  ],
  not_as_described: [
    { name: "not_as_described_matches_and_used", decision: "DISPUTE", when: (s) => s("description_matches_delivery") === "present" && s("usage_after_purchase") === "present" },
    { name: "not_as_described_documented_mismatch", decision: "ACCEPT", when: (s) => s("description_matches_delivery") === "contradicts" && s("mismatch_documented") === "contradicts" },
  ],
  subscription_canceled: [
    { name: "subscription_policy_shown_cancel_after_charge", decision: "DISPUTE", when: (s) => s("policy_shown") === "present" && s("cancel_timing") === "present" },
    { name: "subscription_cancel_before_charge_confirmed", decision: "ACCEPT", when: (s) => s("cancel_timing") === "contradicts" && s("cancellation_confirmation") === "contradicts" },
  ],
  duplicate: [
    { name: "duplicate_distinct_ids_different_products", decision: "DISPUTE", when: (s) => s("distinct_order_ids") === "present" && s("different_products") === "present" },
    { name: "duplicate_same_order_id", decision: "ACCEPT", when: (s) => s("distinct_order_ids") === "contradicts" },
  ],
  credit_not_processed: [
    { name: "credit_policy_shown_request_after_window", decision: "DISPUTE", when: (s) => s("refund_policy_shown") === "present" && s("request_vs_window") === "present" },
    { name: "credit_request_inside_window_no_refund", decision: "ACCEPT", when: (s) => s("request_vs_window") === "contradicts" && s("refund_issued") === "missing" },
  ],
};

export function decide(reason: Proof["reason"], items: ChecklistItem[]): { decision: Decision; rule: string } {
  const status = (name: string) => items.find((i) => i.item === name)?.status;
  const fired = rulesByReason[reason].find((rule) => rule.when(status));
  return fired ? { decision: fired.decision, rule: fired.name } : { decision: "ESCALATE", rule: `${reason}_default_escalate` };
}
