import { describe, expect, it } from "vitest";
import { pickCaseIds } from "./rotation.js";

const ids = Array.from({ length: 10 }, (_, i) => `c${i + 1}`);

describe("pickCaseIds", () => {
  it("starts at the first case for the first participant", () => {
    expect(pickCaseIds(ids, 4, 4)).toEqual(["c1", "c2", "c3", "c4"]);
  });

  it("wraps mod the number of cases", () => {
    expect(pickCaseIds(ids, 12, 4)).toEqual(["c9", "c10", "c1", "c2"]);
  });

  it("gives seven participants of four cases a spread that differs by at most one", () => {
    const counts = new Map<string, number>();
    for (let participant = 1; participant <= 7; participant++) {
      for (const id of pickCaseIds(ids, participant * 4, 4)) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const votes = [...counts.values()];
    expect(votes.reduce((a, b) => a + b, 0)).toBe(28);
    expect(Math.max(...votes) - Math.min(...votes)).toBeLessThanOrEqual(1);
  });

  it("never repeats a case inside one participant list", () => {
    for (let participant = 1; participant <= 20; participant++) {
      const picked = pickCaseIds(ids, participant * 4, 4);
      expect(new Set(picked).size).toBe(4);
    }
  });
});
