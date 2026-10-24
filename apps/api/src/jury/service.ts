import { Redis } from "ioredis";
import type { AssignmentResponse, CaseView, VoteRequest, VoteResponse } from "@receipts/shared";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { reasonLabels } from "../seed/cases.js";
import { buildCheck, isCheckCorrect } from "./check.js";
import { HttpError } from "./errors.js";

// fail fast when redis is down so the assignment returns 503 instead of hanging
const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 1, enableOfflineQueue: false });
redis.on("error", (err) => console.error(`jury redis error: ${err.message}`));

export function roundRobinKey(studyKey: string): string {
  return `jury:rr:${studyKey}`;
}

async function findOpenStudy(studyKey: string) {
  const study = await prisma.study.findUnique({ where: { key: studyKey } });
  if (!study) throw new HttpError(404, "STUDY_NOT_FOUND", `unknown study ${studyKey}`);
  return study;
}

async function nextCaseId(studyKey: string): Promise<string> {
  const cases = await prisma.case.findMany({ orderBy: { key: "asc" }, select: { id: true } });
  if (cases.length === 0) throw new HttpError(503, "ASSIGNMENT_UNAVAILABLE", "no cases seeded");
  let counter: number;
  try {
    counter = await redis.incr(roundRobinKey(studyKey));
  } catch (err) {
    console.error(`assignment counter failed: ${err instanceof Error ? err.message : err}`);
    throw new HttpError(503, "ASSIGNMENT_UNAVAILABLE", "assignment is unavailable, reload in a minute");
  }
  return cases[(counter - 1) % cases.length]!.id;
}

export async function assign(studyKey: string, teracSubmissionId: string): Promise<AssignmentResponse> {
  const study = await findOpenStudy(studyKey);
  const existing = await prisma.assignment.findUnique({ where: { teracSubmissionId } });
  if (existing) return { caseKey: await caseKeyOf(existing.caseId) };
  if (study.status === "closed") throw new HttpError(409, "STUDY_CLOSED", "this study is closed");

  const caseId = await nextCaseId(studyKey);
  try {
    const created = await prisma.assignment.create({ data: { studyId: study.id, caseId, teracSubmissionId } });
    return { caseKey: await caseKeyOf(created.caseId) };
  } catch (err) {
    // a concurrent request for the same submission won the unique insert, return its case
    const winner = await prisma.assignment.findUnique({ where: { teracSubmissionId } });
    if (winner) return { caseKey: await caseKeyOf(winner.caseId) };
    throw err;
  }
}

async function caseKeyOf(caseId: string): Promise<string> {
  const row = await prisma.case.findUniqueOrThrow({ where: { id: caseId }, select: { key: true } });
  return row.key;
}

export async function getCaseView(caseKey: string, studyKey: string): Promise<CaseView> {
  const study = await findOpenStudy(studyKey);
  const row = await prisma.case.findUnique({
    where: { key: caseKey },
    include: { replies: { where: { version: study.replyVersion } } },
  });
  const reply = row?.replies[0];
  if (!row || !reply) throw new HttpError(404, "CASE_NOT_FOUND", `unknown case ${caseKey}`);
  return {
    caseKey: row.key,
    reasonLabel: reasonLabels[row.reason] ?? row.reason,
    amountCents: row.amountCents,
    claimText: row.claimText,
    replyText: reply.text,
    check: buildCheck(row.amountCents),
  };
}

function redirectUrlFor(teracSubmissionId: string): string {
  const url = new URL(config.teracCallbackUrl);
  url.searchParams.set("teracSubmissionId", teracSubmissionId);
  url.searchParams.set("result", "completed");
  return url.toString();
}

export async function castVote(input: VoteRequest): Promise<{ created: boolean; body: VoteResponse }> {
  const study = await findOpenStudy(input.studyKey);
  const assignment = await prisma.assignment.findUnique({ where: { teracSubmissionId: input.teracSubmissionId } });
  if (!assignment || assignment.studyId !== study.id) {
    throw new HttpError(409, "NO_ASSIGNMENT", "no assignment for this submission");
  }
  const body = { redirectUrl: redirectUrlFor(input.teracSubmissionId) };
  const existing = await prisma.vote.findUnique({ where: { assignmentId: assignment.id } });
  if (existing) return { created: false, body };

  const caseRow = await prisma.case.findUniqueOrThrow({ where: { id: assignment.caseId } });
  try {
    await prisma.vote.create({
      data: {
        assignmentId: assignment.id,
        studyId: study.id,
        caseId: assignment.caseId,
        merchantWins: input.merchantWins,
        confidence: input.confidence,
        weaknessTags: input.weaknessTags,
        weaknessText: input.weaknessText ?? null,
        checkPassed: isCheckCorrect(caseRow.amountCents, input.checkAnswer),
      },
    });
  } catch (err) {
    // a double click raced past the existence check, the unique assignment id keeps one vote
    const winner = await prisma.vote.findUnique({ where: { assignmentId: assignment.id } });
    if (winner) return { created: false, body };
    throw err;
  }
  return { created: true, body };
}
