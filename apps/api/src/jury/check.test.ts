import { describe, expect, it } from "vitest";
import { buildCheck, isCheckCorrect } from "./check.js";

describe("comprehension check", () => {
  it("includes the real amount among distinct options", () => {
    const check = buildCheck(3900);
    const values = check.options.map((o) => o.value);
    expect(values).toContain("3900");
    expect(new Set(values).size).toBe(values.length);
  });

  it("only accepts the real amount", () => {
    expect(isCheckCorrect(3900, "3900")).toBe(true);
    expect(isCheckCorrect(3900, "7800")).toBe(false);
  });
});
