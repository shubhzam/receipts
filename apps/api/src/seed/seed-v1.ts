import { prisma } from "../db.js";
import { config } from "../config.js";
import { buildChecklist, type Decision } from "../checklist/index.js";
import { AnthropicLlmClient } from "../llm/anthropic-llm-client.js";
import type { LlmClient } from "../llm/llm-client.js";
import { generateV1, wordCount } from "../reply/v1.js";
import { caseTemplates } from "./cases.js";
import { upsertCase } from "./seed.js";

const V1 = "v1";
const V0 = "v0";

type Row = { key: string; decision: string; expected: Decision; v0Words: number; v1Words: number };

// facts only, v0 replies are never touched
async function reseedFacts(): Promise<void> {
  for (const template of caseTemplates) await upsertCase(template);
}

async function seedCase(llm: LlmClient, key: string): Promise<Row> {
  const row = await prisma.case.findUniqueOrThrow({
    where: { key },
    include: { replies: { where: { version: { in: [V0, V1] } } } },
  });
  const v0 = row.replies.find((r) => r.version === V0);
  if (!v0) throw new Error(`case ${key}: no v0 reply to match length against`);
  const expected: Decision = row.merchantShouldWin ? "DISPUTE" : "ACCEPT";
  const v0Words = wordCount(v0.text);
  const existing = row.replies.find((r) => r.version === V1);
  if (existing) {
    const decision = (existing.meta as { decision?: string } | null)?.decision ?? "?";
    return { key, decision, expected, v0Words, v1Words: wordCount(existing.text) };
  }

  const checklist = buildChecklist(row.factsJson);
  const facts = row.factsJson as { orderRef: string };
  const text = await generateV1(llm, {
    key,
    reason: row.reason,
    amountCents: row.amountCents,
    orderRef: facts.orderRef,
    claimText: row.claimText,
    decision: checklist.decision,
    items: checklist.items,
    v0Words,
  });
  const meta = {
    decision: checklist.decision,
    rule: checklist.rule,
    items: checklist.items.map(({ item, status, value }) => ({ item, status, value })),
  };
  await prisma.reply.create({ data: { caseId: row.id, version: V1, text, model: llm.model, meta } });
  console.log(`case ${key}: wrote ${V1} reply`);
  return { key, decision: checklist.decision, expected, v0Words, v1Words: wordCount(text) };
}

function printTable(rows: Row[]): void {
  console.log("case  decision  expected  v0_words  v1_words  ratio");
  for (const r of rows) {
    const ratio = (r.v1Words / r.v0Words).toFixed(2);
    console.log(`${r.key.padEnd(5)} ${r.decision.padEnd(9)} ${r.expected.padEnd(9)} ${String(r.v0Words).padEnd(9)} ${String(r.v1Words).padEnd(9)} ${ratio}`);
  }
}

export async function runSeedV1(llm: LlmClient): Promise<Row[]> {
  await reseedFacts();
  const rows: Row[] = [];
  for (const template of caseTemplates) rows.push(await seedCase(llm, template.key));
  printTable(rows);
  return rows;
}

runSeedV1(new AnthropicLlmClient(config.anthropicApiKey, config.llmModel))
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(`seed:v1 failed: ${err instanceof Error ? err.message : err}`);
    await prisma.$disconnect();
    process.exit(1);
  });
