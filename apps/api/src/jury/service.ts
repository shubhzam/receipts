import { Redis } from "ioredis";
import type { AssignmentResponse, CaseView, VoteRequest, VoteResponse } from "@receipts/shared";
import type { Assignment } from "../generated/prisma/client.js";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { reasonLabels } from "../seed/cases.js";
import { buildCheck, isCheckCorrect } from "./check.js";
import { HttpError } from "./errors.js";
import { pickCaseIds } from "./rotation.js";

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

async function nextCaseIds(studyKey: string, perParticipant: number): Promise<string[]> {
  const cases = await prisma.case.findMany({ orderBy: { key: "asc" }, select: { id: true } });
  if (cases.length === 0) throw new HttpError(503, "ASSIGNMENT_UNAVAILABLE", "no cases seeded");
  const count = Math.min(perParticipant, cases.length);
  let endSlot: number;
  try {
    endSlot = await redis.incrby(roundRobinKey(studyKey), count);
  } catch (err) {
    console.error(`assignment counter failed: ${err instanceof Error ? err.message : err}`);
    throw new HttpError(503, "ASSIGNMENT_UNAVAILABLE", "assignment is unavailable, reload in a minute");
  }
  return pickCaseIds(
    cases.map((row) => row.id),
    endSlot,
    count,
  );
}

async function caseKeysOf(caseIds: string[]): Promise<string[]> {
  const rows = await prisma.case.findMany({ where: { id: { in: caseIds } }, select: { id: true, key: true } });
  const keyById = new Map(rows.map((row) => [row.id, row.key]));
  return caseIds.map((id) => keyById.get(id)!);
}

function redirectUrlFor(teracSubmissionId: string): string {
  const url = new URL(config.teracCallbackUrl);
  url.searchParams.set("teracSubmissionId", teracSubmissionId);
  url.searchParams.set("result", "completed");
  return url.toString();
}

async function describeAssignment(assignment: Assignment): Promise<AssignmentResponse> {
  const votes = await prisma.vote.findMany({ where: { assignmentId: assignment.id }, select: { caseId: true } });
  const answered = new Set(votes.map((vote) => vote.caseId));
  const caseKeys = await caseKeysOf(assignment.caseIds);
  return {
    caseKeys,
    answeredCaseKeys: caseKeys.filter((_, i) => answered.has(assignment.caseIds[i]!)),
    redirectUrl: answered.size >= assignment.caseIds.length ? redirectUrlFor(assignment.teracSubmissionId) : null,
  };
}

export async function assign(studyKey: string, teracSubmissionId: string): Promise<AssignmentResponse> {
  const study = await findOpenStudy(studyKey);
  const existing = await prisma.assignment.findUnique({ where: { teracSubmissionId } });
  if (existing) return describeAssignment(existing);
  if (study.status === "closed") throw new HttpError(409, "STUDY_CLOSED", "this study is closed");

  const caseIds = await nextCaseIds(studyKey, study.casesPerParticipant);
  try {
    return await describeAssignment(await prisma.assignment.create({ data: { studyId: study.id, caseIds, teracSubmissionId } }));
  } catch (err) {
    // a concurrent request for the same submission won the unique insert, return its list
    const winner = await prisma.assignment.findUnique({ where: { teracSubmissionId } });
    if (winner) return describeAssignment(winner);
    throw err;
  }
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

export async function castVote(input: VoteRequest): Promise<{ created: boolean; body: VoteResponse }> {
  const study = await findOpenStudy(input.studyKey);
  const assignment = await prisma.assignment.findUnique({ where: { teracSubmissionId: input.teracSubmissionId } });
  if (!assignment || assignment.studyId !== study.id) {
    throw new HttpError(409, "NO_ASSIGNMENT", "no assignment for this submission");
  }
  const caseRow = await prisma.case.findUnique({ where: { key: input.caseKey } });
  if (!caseRow || !assignment.caseIds.includes(caseRow.id)) {
    throw new HttpError(409, "CASE_NOT_ASSIGNED", `case ${input.caseKey} is not part of this assignment`);
  }

  const created = await insertVote(input, study.id, assignment.id, caseRow);
  const answered = await prisma.vote.count({ where: { assignmentId: assignment.id } });
  const total = assignment.caseIds.length;
  return {
    created,
    body: { answered, total, redirectUrl: answered >= total ? redirectUrlFor(input.teracSubmissionId) : null },
  };
}

// the unique assignment and case pair keeps a double click down to one vote
async function insertVote(
  input: VoteRequest,
  studyId: string,
  assignmentId: string,
  caseRow: { id: string; amountCents: number },
): Promise<boolean> {
  const existing = await prisma.vote.findUnique({ where: { assignmentId_caseId: { assignmentId, caseId: caseRow.id } } });
  if (existing) return false;
  try {
    await prisma.vote.create({
      data: {
        assignmentId,
        studyId,
        caseId: caseRow.id,
        merchantWins: input.merchantWins,
        confidence: input.confidence,
        weaknessTags: input.weaknessTags,
        weaknessText: input.weaknessText ?? null,
        checkPassed: isCheckCorrect(caseRow.amountCents, input.checkAnswer),
      },
    });
    return true;
  } catch (err) {
    const winner = await prisma.vote.findUnique({ where: { assignmentId_caseId: { assignmentId, caseId: caseRow.id } } });
    if (winner) return false;
    throw err;
  }
}
