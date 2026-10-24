import { describe, expect, it } from "vitest";
import { MockLlmClient } from "../llm/mock-llm-client.js";
import { caseTemplates } from "./cases.js";
import { generateReply, passesFactCheck } from "./replies.js";

const first = caseTemplates[0]!;

describe("case templates", () => {
  it("has ten cases", () => {
    expect(caseTemplates).toHaveLength(10);
  });

  it("has six merchant wins and four losses", () => {
    expect(caseTemplates.filter((c) => c.merchantShouldWin)).toHaveLength(6);
    expect(caseTemplates.filter((c) => !c.merchantShouldWin)).toHaveLength(4);
  });

  it("uses integer cent amounts", () => {
    for (const c of caseTemplates) expect(Number.isInteger(c.amountCents)).toBe(true);
  });
});

describe("fact check", () => {
  it("rejects a wrong amount", () => {
    expect(passesFactCheck(`order ${first.orderRef} was for $41.00`, first)).toBe(false);
  });

  it("rejects a missing order reference", () => {
    expect(passesFactCheck("the charge of $39.00 was valid", first)).toBe(false);
  });

  it("accepts the amount with or without cents", () => {
    expect(passesFactCheck(`${first.orderRef} charged $39.00`, first)).toBe(true);
    expect(passesFactCheck(`${first.orderRef} charged $39`, first)).toBe(true);
  });
});

describe("generateReply", () => {
  it("works offline with the mock client", async () => {
    const llm = new MockLlmClient([`order ${first.orderRef} for $39.00 stands`]);
    await expect(generateReply(llm, first)).resolves.toContain(first.orderRef);
  });

  it("regenerates once after a bad reply", async () => {
    const llm = new MockLlmClient(["bad reply", `order ${first.orderRef} for $39.00 stands`]);
    await expect(generateReply(llm, first)).resolves.toContain(first.orderRef);
    expect(llm.prompts).toHaveLength(2);
  });

  it("fails with the case key after two bad replies", async () => {
    const llm = new MockLlmClient(["bad", "worse"]);
    await expect(generateReply(llm, first)).rejects.toThrow("case d01");
  });
});
