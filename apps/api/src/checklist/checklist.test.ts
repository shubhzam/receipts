import { describe, expect, it } from "vitest";
import { caseTemplates } from "../seed/cases.js";
import { buildChecklist } from "./index.js";

describe("checklist decisions on the ten cases", () => {
  it("matches the expected decision table", () => {
    const decisions = Object.fromEntries(caseTemplates.map((c) => [c.key, buildChecklist({ proof: c.proof }).decision]));
    expect(decisions).toEqual({
      d01: "DISPUTE",
      d02: "ACCEPT",
      d03: "DISPUTE",
      d04: "ACCEPT",
      d05: "DISPUTE",
      d06: "ACCEPT",
      d07: "DISPUTE",
      d08: "ACCEPT",
      d09: "DISPUTE",
      d10: "DISPUTE",
    });
  });

  it("agrees with the ground truth label on every case", () => {
    for (const c of caseTemplates) {
      expect(buildChecklist({ proof: c.proof }).decision === "DISPUTE").toBe(c.merchantShouldWin);
    }
  });

  it("reports the two day gap for d07", () => {
    const d07 = caseTemplates.find((c) => c.key === "d07")!;
    const timing = buildChecklist({ proof: d07.proof }).items.find((i) => i.item === "cancel_timing");
    expect(timing?.value).toContain("2 days after the charge");
  });
});
