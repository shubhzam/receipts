import { describe, expect, it, vi } from "vitest";
import { hasCardLikeDigits, intakeSchema } from "@receipts/shared";
import { caseTemplates } from "../seed/cases.js";
import { canTransition } from "./state.js";
import { newToken, previewFor } from "./service.js";
import { realPaymentSucceeded } from "./fixtures/payment-succeeded.js";
import { findOrder, moneyToCents, paidCents, paymentEventSchema } from "./webhook.js";

const { findUnique, findFirst } = vi.hoisted(() => ({ findUnique: vi.fn(), findFirst: vi.fn() }));
vi.mock("../db.js", () => ({ prisma: { order: { findUnique, findFirst } } }));

const parsedData = (over: Record<string, unknown>) => paymentEventSchema.parse({ type: "payment.succeeded", data: { ...realPaymentSucceeded.data, ...over } }).data;

const d07 = caseTemplates.find((c) => c.key === "d07")!;
const d02 = caseTemplates.find((c) => c.key === "d02")!;
const intakeOf = (c: typeof d07) => intakeSchema.parse({ orderRef: c.orderRef, amountCents: c.amountCents, claimText: c.claimText, proof: c.proof });

describe("order state machine", () => {
  it("allows the happy path and nothing else", () => {
    expect(canTransition("draft", "pending_payment")).toBe(true);
    expect(canTransition("pending_payment", "paid")).toBe(true);
    expect(canTransition("paid", "fulfilled")).toBe(true);
    expect(canTransition("draft", "paid")).toBe(false);
    expect(canTransition("fulfilled", "paid")).toBe(false);
    expect(canTransition("failed", "fulfilled")).toBe(false);
  });
});

describe("card digit guard", () => {
  it("flags long digit runs and grouped card numbers", () => {
    expect(hasCardLikeDigits("4242424242424242")).toBe(true);
    expect(hasCardLikeDigits("4242 4242 4242 4242")).toBe(true);
    expect(hasCardLikeDigits({ nested: ["card 4242-4242-4242-4242"] })).toBe(true);
  });

  it("leaves dates, ids and amounts alone", () => {
    expect(hasCardLikeDigits("2026-10-12T14:03Z to 2026-10-14T09:41Z")).toBe(false);
    expect(hasCardLikeDigits("ORD-2231 and 1900")).toBe(false);
  });

  it("rejects an intake that carries a card number", () => {
    const bad = { orderRef: "ORD-1", amountCents: 1900, claimText: "card 4242 4242 4242 4242", proof: d07.proof };
    expect(intakeSchema.safeParse(bad).success).toBe(false);
  });
});

describe("preview", () => {
  it("gives DISPUTE for d07 and ACCEPT for d02 without internal quotes", () => {
    const dispute = previewFor(intakeOf(d07));
    expect(dispute.decision).toBe("DISPUTE");
    expect(previewFor(intakeOf(d02)).decision).toBe("ACCEPT");
    expect(Object.keys(dispute.items[0]!).sort()).toEqual(["item", "status", "value"]);
  });

  it("makes unguessable tokens", () => {
    expect(newToken()).toMatch(/^rcp_[A-Za-z0-9_-]{24}$/);
    expect(newToken()).not.toBe(newToken());
  });
});

describe("paid amount", () => {
  it("turns whop decimal strings into cents", () => {
    expect(moneyToCents("29.00")).toBe(2900);
    expect(moneyToCents("29")).toBe(2900);
    expect(moneyToCents("28.5")).toBe(2850);
    expect(moneyToCents("abc")).toBeNull();
  });

  it("reads the usd total and ignores other currencies", () => {
    const base = { id: "pay_1", metadata: null };
    expect(paidCents({ ...base, total: { amount: "29.00", currency: "usd" } })).toBe(2900);
    expect(paidCents({ ...base, total: { amount: "29.00", currency: "eur" } })).toBeNull();
  });
});

describe("real payment.succeeded shape", () => {
  const parsed = () => paymentEventSchema.parse(realPaymentSucceeded);

  it("parses the body whop actually sends, with amounts as dollar numbers", () => {
    const event = parsed();
    expect(event.type).toBe("payment.succeeded");
    expect(event.data.id).toBe("pay_TESTTESTTESTTE");
    expect(event.data.metadata?.orderId).toBe("01a16f8f-0000-7000-8000-000000000001");
    expect(event.data.checkout_configuration_id).toBe("ch_TESTTESTTESTTES");
  });

  it("reads 29.0 dollars as 2900 cents", () => {
    expect(paidCents(parsed().data)).toBe(2900);
  });

  it("still reads sdk style money objects and strings", () => {
    const base = { id: "pay_1" };
    expect(paidCents({ ...base, usd_total: { amount: "29.00", currency: "usd" } })).toBe(2900);
    expect(paidCents({ ...base, usd_total: "29.00" })).toBe(2900);
    expect(paidCents({ ...base, total: 28.5, currency: "usd" })).toBe(2850);
  });

  it("refuses a total in another currency", () => {
    expect(paidCents({ id: "pay_1", total: 29.0, currency: "eur" })).toBeNull();
  });
});

describe("matching the order", () => {
  const order = { id: "o1", whopCheckoutId: "ch_TESTTESTTESTTES" };

  it("uses metadata first and falls back to the checkout configuration id", async () => {
    findUnique.mockResolvedValueOnce(order);
    expect((await findOrder(parsedData({ metadata: { orderId: "o1" } })))?.id).toBe("o1");

    findUnique.mockResolvedValueOnce(null);
    findFirst.mockResolvedValueOnce(order);
    const viaCheckout = await findOrder(parsedData({ metadata: { orderId: "gone" } }));
    expect(viaCheckout?.id).toBe("o1");
    expect(findFirst).toHaveBeenCalledWith({ where: { whopCheckoutId: "ch_TESTTESTTESTTES" } });

    findFirst.mockResolvedValueOnce(order);
    expect((await findOrder(parsedData({ metadata: null })))?.id).toBe("o1");
  });

  it("returns nothing when neither link matches", async () => {
    findUnique.mockResolvedValueOnce(null);
    findFirst.mockResolvedValueOnce(null);
    expect(await findOrder(parsedData({}))).toBeNull();
  });
});
