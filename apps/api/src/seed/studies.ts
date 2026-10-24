import { prisma } from "../db.js";
import { config } from "../config.js";
import { caseTemplates } from "./cases.js";

type StudyDef = { round: string; replyVersion: string };

// one row per study, the study key is the seed parameter
export const studyDefs: Record<string, StudyDef> = {
  "baseline-1": { round: "baseline", replyVersion: "v0" },
  "after-1": { round: "after", replyVersion: "v1" },
};

// votes per case is the ceiling of the planned total spread over the cases
function plannedVotesPerCase(): number {
  return Math.ceil((config.juryParticipants * config.juryCasesPerParticipant) / caseTemplates.length);
}

export async function seedStudy(key: string): Promise<void> {
  const def = studyDefs[key];
  if (!def) throw new Error(`unknown study ${key}, known: ${Object.keys(studyDefs).join(", ")}`);
  const plan = { targetVotesPerCase: plannedVotesPerCase(), casesPerParticipant: config.juryCasesPerParticipant };
  await prisma.study.upsert({
    where: { key },
    create: { key, round: def.round, replyVersion: def.replyVersion, status: "draft", ...plan },
    update: {},
  });
  // only a draft study follows the config, a launched one keeps the plan it launched with
  await prisma.study.updateMany({ where: { key, status: "draft" }, data: plan });
  console.log(`study ${key} ready: round ${def.round}, replies ${def.replyVersion}`);
}

// usage: tsx src/seed/studies.ts <studyKey>
if (process.argv[1]?.endsWith("studies.ts")) {
  seedStudy(process.argv[2] ?? "")
    .then(() => prisma.$disconnect())
    .catch(async (err) => {
      console.error(`seed study failed: ${err instanceof Error ? err.message : err}`);
      await prisma.$disconnect();
      process.exit(1);
    });
}
