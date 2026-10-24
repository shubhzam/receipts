import { prisma } from "../db.js";

// usage: tsx src/scripts/record-launch.ts <studyKey> <teracOpportunityId> <launchedAtIso>
async function main(): Promise<void> {
  const [studyKey, teracOpportunityId, launchedAt] = process.argv.slice(2);
  if (!studyKey || !teracOpportunityId || !launchedAt) throw new Error("usage: record-launch <studyKey> <opportunityId> <launchedAtIso>");
  const study = await prisma.study.update({
    where: { key: studyKey },
    data: { teracOpportunityId, status: "launched", launchedAt: new Date(launchedAt) },
  });
  console.log(`study ${study.key} is ${study.status}, opportunity ${study.teracOpportunityId}, launched ${study.launchedAt?.toISOString()}`);
}

main()
  .catch((err) => {
    console.error(`record-launch failed: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
