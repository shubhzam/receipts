import { writeFile } from "node:fs/promises";
import { prisma } from "../db.js";
import { wordCount } from "../reply/v1.js";

type Meta = { decision: string; rule: string; items: { item: string; status: string; value: string }[] };

async function main(): Promise<void> {
  const cases = await prisma.case.findMany({ orderBy: { key: "asc" }, include: { replies: true } });
  const parts = ["# v0 vs v1 replies", "", "ten cases, v0 is the plain one-shot prompt, v1 is the checklist decision plus a fact-checked write-up.", ""];
  for (const c of cases) {
    const v0 = c.replies.find((r) => r.version === "v0");
    const v1 = c.replies.find((r) => r.version === "v1");
    if (!v0 || !v1) throw new Error(`case ${c.key}: missing v0 or v1 reply`);
    const meta = v1.meta as Meta;
    parts.push(
      `## ${c.key} - ${c.reason}, $${(c.amountCents / 100).toFixed(2)}, ground truth: ${c.merchantShouldWin ? "merchant should win" : "customer should win"}`,
      "",
      `customer claim: ${c.claimText}`,
      "",
      `checklist decision: ${meta.decision} (rule ${meta.rule})`,
      "",
      ...meta.items.map((i) => `- ${i.item} [${i.status}]: ${i.value}`),
      "",
      `### v0 (${wordCount(v0.text)} words)`,
      "",
      v0.text,
      "",
      `### v1 (${wordCount(v1.text)} words)`,
      "",
      v1.text,
      "",
    );
  }
  const path = new URL("../../../../docs/v0-vs-v1.md", import.meta.url);
  await writeFile(path, parts.join("\n"));
  console.log(`wrote docs/v0-vs-v1.md with ${cases.length} cases`);
}

main()
  .catch((err) => {
    console.error(`export failed: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
