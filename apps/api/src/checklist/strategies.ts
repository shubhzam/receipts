import type { ChecklistItem, ItemStatus, Proof, ProofFor } from "./types.js";

function item(name: string, status: ItemStatus, value: string, quote: string[] = []): ChecklistItem {
  return { item: name, status, value, quote };
}

// whole utc calendar days from a to b, negative when b is earlier
export function daysBetween(fromIso: string, toIso: string): number {
  const day = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
  return Math.round((day(toIso) - day(fromIso)) / 86_400_000);
}

function fraudItems(p: ProofFor<"fraud">): ChecklistItem[] {
  const emailMatches = p.purchaseEmail === p.accountEmail;
  const countryMatches = p.purchaseCountry === p.cardholderCountry;
  const hasAccess = p.loginsAfterPurchase > 0 && p.loginsFromPurchaseSource;
  return [
    emailMatches
      ? item("email_match", "present", `purchase email and account email are both ${p.purchaseEmail}`, [p.purchaseEmail])
      : item("email_match", "contradicts", `purchase email ${p.purchaseEmail} differs from account email ${p.accountEmail}`, [p.purchaseEmail, p.accountEmail]),
    hasAccess
      ? item("access_after_purchase", "present", `${p.loginsAfterPurchase} logins over ${p.loginDays} days from the purchase IP address and device`, [`${p.loginsAfterPurchase} logins`, `${p.loginDays} days`])
      : item("access_after_purchase", "missing", p.loginsAfterPurchase === 0 ? "no logins recorded on the account after the purchase" : "logins did not come from the purchase IP address or device"),
    countryMatches
      ? item("country_match", "present", `purchase IP address and cardholder are both in ${p.purchaseCountry}`, [p.purchaseCountry])
      : item("country_match", "contradicts", `purchase IP address is in ${p.purchaseCountry} while the cardholder is in ${p.cardholderCountry}`, [p.purchaseCountry, p.cardholderCountry]),
  ];
}

function notReceivedItems(p: ProofFor<"not_received">): ChecklistItem[] {
  const delivered = p.deliveryStatus === "delivered";
  const window = p.accessWindowMinutes === null ? "" : ` within ${p.accessWindowMinutes} minutes of purchase`;
  return [
    delivered
      ? item("delivery_email", "present", `delivery email to ${p.deliveryEmail} was delivered at ${p.deliveryAt}`, [p.deliveryEmail, p.deliveryAt])
      : item("delivery_email", "contradicts", `delivery email to ${p.deliveryEmail} bounced at ${p.deliveryAt}`, [p.deliveryEmail, p.deliveryAt]),
    p.accessEvents > 0
      ? item("access_logged", "present", `${p.accessEvents} downloads logged${window}`, [`${p.accessEvents} downloads`, ...(window ? [`${p.accessWindowMinutes} minutes`] : [])])
      : item("access_logged", "missing", "no access or download events are logged for this order"),
  ];
}

function notAsDescribedItems(p: ProofFor<"not_as_described">): ChecklistItem[] {
  return [
    p.descriptionMatches
      ? item("description_matches_delivery", "present", `checkout page listed ${p.listed} and ${p.delivered} were delivered`, [p.listed])
      : item("description_matches_delivery", "contradicts", `checkout page said ${p.listed} but ${p.delivered} was delivered`, [p.listed, p.delivered]),
    p.usageSummary
      ? item("usage_after_purchase", "present", p.usageSummary, p.usageQuote)
      : item("usage_after_purchase", "missing", "no usage is logged for this order"),
    p.mismatchEvidence
      ? item("mismatch_documented", "contradicts", p.mismatchEvidence, p.mismatchQuote)
      : item("mismatch_documented", "missing", "no mismatch between the listing and the delivery is documented"),
  ];
}

function subscriptionItems(p: ProofFor<"subscription_canceled">): ChecklistItem[] {
  const days = daysBetween(p.chargeAt, p.cancelRequestAt);
  const afterCharge = days > 0;
  return [
    p.policyShown
      ? item("policy_shown", "present", `cancellation policy shown at checkout: ${p.policyText}`, [p.policyText])
      : item("policy_shown", "missing", "no cancellation policy was shown before purchase"),
    afterCharge
      ? item("cancel_timing", "present", `charge at ${p.chargeAt}, cancel request at ${p.cancelRequestAt}, ${days} days after the charge`, [p.chargeAt, p.cancelRequestAt, `${days} days`])
      : item("cancel_timing", "contradicts", `cancel request at ${p.cancelRequestAt}, ${-days} days before the charge at ${p.chargeAt}`, [p.cancelRequestAt, `${-days} days`, p.chargeAt]),
    p.cancelConfirmationAt
      ? item("cancellation_confirmation", "contradicts", `cancellation confirmation email sent at ${p.cancelConfirmationAt}`, [p.cancelConfirmationAt])
      : item("cancellation_confirmation", "missing", "no cancellation confirmation exists"),
  ];
}

function duplicateItems(p: ProofFor<"duplicate">): ChecklistItem[] {
  const [first, second] = p.orderIds;
  const idsDistinct = first !== second;
  return [
    idsDistinct
      ? item("distinct_order_ids", "present", `two charges on ${p.chargedOn} with distinct order ids ${first} and ${second}`, [p.chargedOn, first, second])
      : item("distinct_order_ids", "contradicts", `both charges on ${p.chargedOn} carry the same order id ${first}`, [p.chargedOn, first]),
    p.products[0] !== p.products[1]
      ? item("different_products", "present", `the orders are for two different products, ${p.products[0]} and ${p.products[1]}`, [...p.products])
      : item("different_products", "contradicts", `both orders are for the same product, ${p.products[0]}`, [p.products[0]]),
  ];
}

function creditItems(p: ProofFor<"credit_not_processed">): ChecklistItem[] {
  const afterWindow = p.dayOfRequest > p.windowDays;
  const declined = p.requestDeclined ? " and was declined" : "";
  return [
    p.policyShown
      ? item("refund_policy_shown", "present", `${p.windowDays}-day refund policy was shown at checkout`, [`${p.windowDays}-day refund policy`])
      : item("refund_policy_shown", "missing", "no refund policy was shown before purchase"),
    afterWindow
      ? item("request_vs_window", "present", `refund requested on day ${p.dayOfRequest} (${p.requestedOn}), after the ${p.windowDays}-day window${declined}`, [`day ${p.dayOfRequest}`, p.requestedOn, `${p.windowDays}-day window`])
      : item("request_vs_window", "contradicts", `refund requested on day ${p.dayOfRequest} (${p.requestedOn}), inside the ${p.windowDays}-day window`, [`day ${p.dayOfRequest}`, p.requestedOn, `${p.windowDays}-day window`]),
    p.refundIssued
      ? item("refund_issued", "present", "a refund has been issued")
      : item("refund_issued", "missing", "no refund has been issued"),
  ];
}

// one pure strategy per dispute reason
export function itemsFor(proof: Proof): ChecklistItem[] {
  switch (proof.reason) {
    case "fraud":
      return fraudItems(proof);
    case "not_received":
      return notReceivedItems(proof);
    case "not_as_described":
      return notAsDescribedItems(proof);
    case "subscription_canceled":
      return subscriptionItems(proof);
    case "duplicate":
      return duplicateItems(proof);
    case "credit_not_processed":
      return creditItems(proof);
  }
}
