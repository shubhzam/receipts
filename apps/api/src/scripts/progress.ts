import { prisma } from "../db.js";

async function printStudy(study: { id: string; key: string; status: string; targetVotesPerCase: number; casesPerParticipant: number }) {
  const assignments = await prisma.assignment.findMany({ where: { studyId: study.id }, select: { id: true, caseIds: true } });
  const votes = await prisma.vote.findMany({ where: { studyId: study.id }, select: { assignmentId: true, caseId: true } });
  const votesByAssignment = new Map<string, number>();
  const votesByCase = new Map<string, number>();
  for (const vote of votes) {
    votesByAssignment.set(vote.assignmentId, (votesByAssignment.get(vote.assignmentId) ?? 0) + 1);
    votesByCase.set(vote.caseId, (votesByCase.get(vote.caseId) ?? 0) + 1);
  }
  const completed = assignments.filter((a) => (votesByAssignment.get(a.id) ?? 0) >= a.caseIds.length).length;

  console.log(`study ${study.key} (${study.status}), plan ${study.casesPerParticipant} cases each, up to ${study.targetVotesPerCase} votes per case`);
  console.log(`assignments: ${assignments.length}, votes: ${votes.length}, completed participants: ${completed}`);
  const cases = await prisma.case.findMany({ orderBy: { key: "asc" }, select: { id: true, key: true } });
  console.log(`votes per case: ${cases.map((c) => `${c.key}=${votesByCase.get(c.id) ?? 0}`).join(" ")}`);
}

async function main(): Promise<void> {
  const studies = await prisma.study.findMany({ orderBy: { key: "asc" } });
  for (const study of studies) await printStudy(study);
}

main()
  .catch((err) => {
    console.error(`progress failed: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
