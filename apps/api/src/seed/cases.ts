export type CaseTemplate = {
  key: string;
  reason: string;
  amountCents: number;
  merchantShouldWin: boolean;
  orderRef: string;
  claimText: string;
  facts: string[];
};

export const reasonLabels: Record<string, string> = {
  fraud: "Unauthorized purchase (fraud)",
  not_received: "Item not received",
  not_as_described: "Not as described",
  subscription_canceled: "Subscription canceled",
  duplicate: "Duplicate charge",
  credit_not_processed: "Refund not processed",
};

export const caseTemplates: CaseTemplate[] = [
  {
    key: "d01",
    reason: "fraud",
    amountCents: 3900,
    merchantShouldWin: true,
    orderRef: "ORD-1101",
    claimText: "I did not make this purchase. I don't recognise this charge on my card and want my money back.",
    facts: [
      "the buyer email matches the email on the account",
      "there were 11 logins over 6 days from the same IP address and device used at purchase",
    ],
  },
  {
    key: "d02",
    reason: "fraud",
    amountCents: 8900,
    merchantShouldWin: false,
    orderRef: "ORD-1102",
    claimText: "I never bought this. Someone used my card and I want the charge reversed.",
    facts: [
      "the purchase IP address is in a different country than the cardholder",
      "the purchase came from a new device never seen on the account",
      "the purchase email differs from the account email by one letter",
      "the account has no logins since the purchase",
    ],
  },
  {
    key: "d03",
    reason: "not_received",
    amountCents: 2400,
    merchantShouldWin: true,
    orderRef: "ORD-1103",
    claimText: "I paid for a digital download and never received it.",
    facts: [
      "the download link was emailed at purchase",
      "3 downloads were logged within 10 minutes of the purchase",
    ],
  },
  {
    key: "d04",
    reason: "not_received",
    amountCents: 5900,
    merchantShouldWin: false,
    orderRef: "ORD-1104",
    claimText: "I paid for a software license and never got it. I can't use what I bought.",
    facts: [
      "the delivery email bounced",
      "there are no access logs for this order",
      "the license key was never activated",
    ],
  },
  {
    key: "d05",
    reason: "not_as_described",
    amountCents: 12900,
    merchantShouldWin: true,
    orderRef: "ORD-1105",
    claimText: "The course was not what the page described. It was missing content I paid for.",
    facts: [
      "the checkout page listed 6 modules",
      "the customer opened all 6 modules",
      "the customer completed 5 of the 6 modules",
    ],
  },
  {
    key: "d06",
    reason: "not_as_described",
    amountCents: 4900,
    merchantShouldWin: false,
    orderRef: "ORD-1106",
    claimText: "The product page said it works with version 5 and version 6. I only got version 5.",
    facts: [
      "the product page said it works with v5 and v6",
      "only the v5 files were delivered",
      "support emails confirm the v6 gap",
    ],
  },
  {
    key: "d07",
    reason: "subscription_canceled",
    amountCents: 1900,
    merchantShouldWin: true,
    orderRef: "ORD-1107",
    claimText: "I canceled my subscription but I was still charged this month.",
    facts: [
      "the cancel request came 2 days after the charge",
      "the policy shown at checkout said cancellation applies from the next billing cycle",
    ],
  },
  {
    key: "d08",
    reason: "subscription_canceled",
    amountCents: 1900,
    merchantShouldWin: false,
    orderRef: "ORD-1108",
    claimText: "I canceled my subscription before the renewal date and was charged anyway.",
    facts: [
      "the customer canceled 6 days before the charge",
      "a cancellation confirmation email exists",
      "the customer was charged anyway",
    ],
  },
  {
    key: "d09",
    reason: "duplicate",
    amountCents: 1500,
    merchantShouldWin: true,
    orderRef: "ORD-1109",
    claimText: "I was charged twice on the same day for the same thing.",
    facts: [
      "there were two charges on the same day",
      "the two charges have distinct order ids for two different products",
    ],
  },
  {
    key: "d10",
    reason: "credit_not_processed",
    amountCents: 7900,
    merchantShouldWin: true,
    orderRef: "ORD-1110",
    claimText: "I asked for a refund and it was never processed.",
    facts: [
      "a 14-day refund policy was shown at checkout",
      "the refund was requested on day 31",
      "the request was declined",
    ],
  },
];
