"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { assignmentResponseSchema, errorResponseSchema, type AssignmentResponse } from "@receipts/shared";
import { apiFetch } from "@/api";
import { DoneNotice } from "./done-notice";

async function requestAssignment(
  studyKey: string,
  teracSubmissionId: string,
  taskId: string | null,
): Promise<AssignmentResponse> {
  const res = await apiFetch("/jury/assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studyKey, teracSubmissionId, ...(taskId ? { taskId } : {}) }),
  });
  const body: unknown = await res.json();
  if (!res.ok) {
    const parsed = errorResponseSchema.safeParse(body);
    throw new Error(parsed.success ? parsed.data.error.message : "something went wrong, please reload");
  }
  return assignmentResponseSchema.parse(body);
}

function JuryEntry() {
  const router = useRouter();
  const params = useSearchParams();
  const study = params.get("study");
  const sid = params.get("teracSubmissionId") ?? params.get("submissionId");
  const taskId = params.get("taskId");
  const [error, setError] = useState<string | null>(null);
  const [doneUrl, setDoneUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!study || !sid) return;
    requestAssignment(study, sid, taskId)
      .then((assignment) => {
        if (assignment.redirectUrl) return setDoneUrl(assignment.redirectUrl);
        // a reopened link resumes at the first case without a vote
        const next = assignment.caseKeys.find((key) => !assignment.answeredCaseKeys.includes(key)) ?? assignment.caseKeys[0];
        const cases = encodeURIComponent(assignment.caseKeys.join(","));
        router.replace(`/jury/${next}?study=${encodeURIComponent(study)}&sid=${encodeURIComponent(sid)}&cases=${cases}`);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "please reload in a minute"));
  }, [study, sid, taskId, router]);

  if (!study || !sid) return <p className="text-red-600">this link is missing its study or submission id, please open it from Terac again</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (doneUrl) return <DoneNotice redirectUrl={doneUrl} />;
  return <p>loading your cases...</p>;
}

export default function JuryPage() {
  return (
    <main className="mx-auto w-full max-w-xl p-4 sm:p-8">
      <Suspense fallback={<p>loading...</p>}>
        <JuryEntry />
      </Suspense>
    </main>
  );
}
