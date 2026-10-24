import { prisma } from "../db.js";
import { config } from "../config.js";
import { AnthropicLlmClient } from "../llm/anthropic-llm-client.js";
import type { LlmClient } from "../llm/llm-client.js";
import { caseTemplates, type CaseTemplate } from "./cases.js";
import { generateReply } from "./replies.js";

const REPLY_VERSION = "v0";
const STUDY_KEY = "baseline-1";

async function upsertCase(template: CaseTemplate): Promise<string> {
  const data = {
    reason: template.reason,
    amountCents: template.amountCents,
    claimText: template.claimText,
    factsJson: { orderRef: template.orderRef, facts: template.facts },
    merchantShouldWin: template.merchantShouldWin,
  };
  const row = await prisma.case.upsert({ where: { key: template.key }, create: { key: template.key, ...data }, update: data });
  return row.id;
}

async function seedReply(llm: LlmClient, template: CaseTemplate, caseId: string): Promise<void> {
  const existing = await prisma.reply.findUnique({ where: { caseId_version: { caseId, version: REPLY_VERSION } } });
  if (existing) {
    console.log(`case ${template.key}: ${REPLY_VERSION} reply exists, skipping`);
    return;
  }
  const text = await generateReply(llm, template);
  await prisma.reply.create({ data: { caseId, version: REPLY_VERSION, text, model: llm.model } });
  console.log(`case ${template.key}: wrote ${REPLY_VERSION} reply`);
}

async function seedStudy(): Promise<void> {
  await prisma.study.upsert({
    where: { key: STUDY_KEY },
    create: {
      key: STUDY_KEY,
      round: "baseline",
      replyVersion: REPLY_VERSION,
      targetVotesPerCase: config.juryVotesPerCase,
      status: "draft",
    },
    update: {},
  });
}

export async function runSeed(llm: LlmClient): Promise<void> {
  for (const template of caseTemplates) {
    const caseId = await upsertCase(template);
    await seedReply(llm, template, caseId);
  }
  await seedStudy();
  console.log(`seed done: ${caseTemplates.length} cases, study ${STUDY_KEY}`);
}

if (process.argv[1]?.endsWith("seed.ts")) {
  runSeed(new AnthropicLlmClient(config.anthropicApiKey, config.llmModel))
    .then(() => prisma.$disconnect())
    .catch(async (err) => {
      console.error(`seed failed: ${err instanceof Error ? err.message : err}`);
      await prisma.$disconnect();
      process.exit(1);
    });
}
