"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { assignmentResponseSchema, errorResponseSchema } from "@receipts/shared";
import { apiFetch } from "@/api";

async function requestAssignment(studyKey: string, teracSubmissionId: string, taskId: string | null): Promise<string> {
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
  return assignmentResponseSchema.parse(body).caseKey;
}

function JuryEntry() {
  const router = useRouter();
  const params = useSearchParams();
  const study = params.get("study");
  const sid = params.get("teracSubmissionId") ?? params.get("submissionId");
  const taskId = params.get("taskId");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!study || !sid) return;
    requestAssignment(study, sid, taskId)
      .then((caseKey) => router.replace(`/jury/${caseKey}?study=${encodeURIComponent(study)}&sid=${encodeURIComponent(sid)}`))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "please reload in a minute"));
  }, [study, sid, taskId, router]);

  if (!study || !sid) return <p className="text-red-600">this link is missing its study or submission id, please open it from Terac again</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  return <p>loading your case...</p>;
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
