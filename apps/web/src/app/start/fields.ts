import { intakeSchema, type Intake } from "@receipts/shared";

type Base = { key: string; label: string; hint?: string };
export type Field =
  | (Base & { kind: "text" | "nullableText" | "utc" | "nullableUtc" | "date" | "int" | "nullableInt" | "bool" | "lines" | "pair" })
  | (Base & { kind: "select"; options: { value: string; label: string }[] });

export const reasonOptions = [
  { value: "fraud", label: "Unauthorized purchase (fraud)" },
  { value: "not_received", label: "Item not received" },
  { value: "not_as_described", label: "Not as described" },
  { value: "subscription_canceled", label: "Subscription canceled" },
  { value: "duplicate", label: "Duplicate charge" },
  { value: "credit_not_processed", label: "Refund not processed" },
] as const;

export type Reason = (typeof reasonOptions)[number]["value"];

const utcHint = "date and time in UTC";

// one section per reason, the keys are the F5a proof keys so the checklist can run on them
export const fieldsByReason: Record<Reason, Field[]> = {
  fraud: [
    { key: "purchaseEmail", label: "Email used at purchase", kind: "text" },
    { key: "accountEmail", label: "Email on the customer account", kind: "text" },
    { key: "purchaseCountry", label: "Country of the purchase IP address", kind: "text" },
    { key: "cardholderCountry", label: "Cardholder country", kind: "text" },
    { key: "loginsAfterPurchase", label: "Logins to the account after the purchase", kind: "int", hint: "0 if none" },
    { key: "loginDays", label: "Over how many days", kind: "int", hint: "0 if none" },
    { key: "loginsFromPurchaseSource", label: "Did the logins come from the purchase IP address and device?", kind: "bool" },
  ],
  not_received: [
    { key: "deliveryEmail", label: "Email the delivery was sent to", kind: "text" },
    { key: "deliveryStatus", label: "Delivery result", kind: "select", options: [{ value: "delivered", label: "Delivered" }, { value: "bounced", label: "Bounced" }] },
    { key: "deliveryAt", label: "When the delivery email was sent", kind: "utc", hint: utcHint },
    { key: "accessEvents", label: "Downloads or access events logged", kind: "int", hint: "0 if none" },
    { key: "accessWindowMinutes", label: "Minutes after purchase the access happened", kind: "nullableInt", hint: "leave empty if no access" },
  ],
  not_as_described: [
    { key: "listed", label: "What the checkout page listed", kind: "text" },
    { key: "delivered", label: "What was delivered", kind: "text" },
    { key: "descriptionMatches", label: "Does the listing match what was delivered?", kind: "bool" },
    { key: "mismatchEvidence", label: "Evidence of a mismatch", kind: "nullableText", hint: "leave empty if there is none" },
    { key: "mismatchQuote", label: "Exact phrases from that evidence to quote", kind: "lines", hint: "one per line, copied word for word" },
    { key: "usageSummary", label: "Usage you can show after the purchase", kind: "nullableText", hint: "leave empty if there is none" },
    { key: "usageQuote", label: "Exact phrases from that usage to quote", kind: "lines", hint: "one per line, copied word for word" },
  ],
  subscription_canceled: [
    { key: "policyShown", label: "Was the cancellation policy shown at checkout?", kind: "bool" },
    { key: "policyText", label: "Policy text the customer saw", kind: "text", hint: "copy it exactly, empty if none was shown" },
    { key: "chargeAt", label: "When the charge happened", kind: "utc", hint: utcHint },
    { key: "cancelRequestAt", label: "When the customer asked to cancel", kind: "utc", hint: utcHint },
    { key: "cancelConfirmationAt", label: "When you sent a cancellation confirmation", kind: "nullableUtc", hint: "leave empty if you never sent one" },
  ],
  duplicate: [
    { key: "chargedOn", label: "Date of the charges", kind: "date" },
    { key: "orderIds", label: "The two order ids", kind: "pair" },
    { key: "products", label: "The two products", kind: "pair" },
  ],
  credit_not_processed: [
    { key: "policyShown", label: "Was the refund policy shown at checkout?", kind: "bool" },
    { key: "windowDays", label: "Refund window in days", kind: "int" },
    { key: "requestedOn", label: "Date the customer asked for a refund", kind: "date" },
    { key: "dayOfRequest", label: "Which day after purchase that was", kind: "int", hint: "day 1 is the purchase day" },
    { key: "requestDeclined", label: "Did you decline the request?", kind: "bool" },
    { key: "refundIssued", label: "Has a refund been issued?", kind: "bool" },
  ],
};

export type FormValues = Record<string, string>;

function toValue(field: Field, v: FormValues): unknown {
  const raw = (v[field.key] ?? "").trim();
  switch (field.kind) {
    case "text":
    case "date":
    case "select":
      return raw;
    case "nullableText":
      return raw === "" ? null : raw;
    case "utc":
      return raw === "" ? "" : `${raw}Z`;
    case "nullableUtc":
      return raw === "" ? null : `${raw}Z`;
    case "int":
      return raw === "" ? undefined : Number(raw);
    case "nullableInt":
      return raw === "" ? null : Number(raw);
    case "bool":
      return raw === "yes" ? true : raw === "no" ? false : undefined;
    case "lines":
      return (v[field.key] ?? "").split("\n").map((line) => line.trim()).filter(Boolean);
    case "pair":
      return [(v[`${field.key}0`] ?? "").trim(), (v[`${field.key}1`] ?? "").trim()];
  }
}

export type BuildResult = { ok: true; intake: Intake } | { ok: false; errors: string[] };

// turns the form into an intake and names the fields that fail, the api checks it again
export function buildIntake(reason: Reason, common: { orderRef: string; amount: string; claimText: string }, values: FormValues): BuildResult {
  const fields = fieldsByReason[reason];
  const proof: Record<string, unknown> = { reason };
  for (const field of fields) proof[field.key] = toValue(field, values);
  const dollars = Number(common.amount.replace(/[$,\s]/g, ""));
  const parsed = intakeSchema.safeParse({
    orderRef: common.orderRef,
    amountCents: Number.isFinite(dollars) ? Math.round(dollars * 100) : undefined,
    claimText: common.claimText,
    proof,
  });
  if (parsed.success) return { ok: true, intake: parsed.data };

  const labels: Record<string, string> = { orderRef: "Order reference", amountCents: "Amount", claimText: "What the customer claims" };
  for (const field of fields) labels[field.key] = field.label;
  const errors = parsed.error.issues.map((issue) => {
    const path = issue.path.filter((p): p is string => typeof p === "string");
    const name = path[0] === "proof" ? path[1] : path[0];
    if (!name || !labels[name]) return issue.message;
    return `${labels[name]}: please check this value`;
  });
  return { ok: false, errors: [...new Set(errors)] };
}
