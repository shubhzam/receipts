import { describe, expect, it } from "vitest";
import { buildChecklist } from "../checklist/index.js";
import { MockLlmClient } from "../llm/mock-llm-client.js";
import { caseTemplates } from "../seed/cases.js";
import { checkV1, generateV1, wordCount, type V1Input } from "./v1.js";

const d07 = caseTemplates.find((c) => c.key === "d07")!;
const checklist = buildChecklist({ proof: d07.proof });
const input: V1Input = {
  key: "d07",
  reason: d07.reason,
  amountCents: d07.amountCents,
  orderRef: d07.orderRef,
  claimText: d07.claimText,
  decision: checklist.decision,
  items: checklist.items,
  v0Words: 0,
};

const good =
  "order ORD-1107 is a subscription charge of $19.00. at checkout the customer saw the policy: cancellation applies from the next billing cycle. " +
  "the charge was made at 2026-10-12T14:03Z and the cancel request came at 2026-10-14T09:41Z, 2 days after the charge. please resolve this in the merchant's favor.";

input.v0Words = wordCount(good);

describe("v1 fact check", () => {
  it("passes a reply that carries every item", () => {
    expect(checkV1(good, input)).toEqual([]);
  });

  it("rejects a wrong amount and an invented number", () => {
    const problems = checkV1(good.replace("$19.00", "$21.00") + " we waited 30 days.", input);
    expect(problems.join(" ")).toContain("amount");
    expect(problems.join(" ")).toContain("numbers not in the items");
  });

  it("rejects a reply that leaks an item name", () => {
    expect(checkV1(`${good} the cancel_timing item reads fine.`, input).join(" ")).toContain("cancel_timing must not appear");
  });

  it("rejects a reply outside the length window", () => {
    expect(checkV1(good, { ...input, v0Words: 112 }).join(" ")).toContain("words, must be");
  });

  it("works offline with the mock client after one bad reply", async () => {
    const llm = new MockLlmClient(["too short", good]);
    await expect(generateV1(llm, input)).resolves.toContain("ORD-1107");
    expect(llm.prompts[1]).toContain("rejected for these problems");
  });
});
