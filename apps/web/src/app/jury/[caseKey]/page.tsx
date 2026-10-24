"use client";

import { Suspense, use, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  caseViewSchema,
  errorResponseSchema,
  voteResponseSchema,
  weaknessTags,
  type CaseView,
  type VoteResponse,
  type WeaknessTag,
} from "@receipts/shared";
import { apiFetch } from "@/api";
import { DoneNotice } from "../done-notice";

const tagLabels: Record<WeaknessTag, string> = {
  no_proof_of_use: "no proof the customer used it",
  reply_too_vague: "the reply is too vague",
  proof_does_not_match_claim: "the proof does not match the claim",
  policy_not_shown_before_purchase: "policy was not shown before purchase",
  dates_or_amounts_dont_add_up: "dates or amounts don't add up",
  tone: "tone of the reply",
  nothing_weak: "nothing was weak",
};

async function fetchCase(caseKey: string, study: string): Promise<CaseView> {
  const res = await apiFetch(`/jury/cases/${caseKey}?study=${encodeURIComponent(study)}`, { cache: "no-store" });
  if (!res.ok) throw new Error("could not load this case, please reload");
  return caseViewSchema.parse(await res.json());
}

type VoteForm = {
  merchantWins: boolean | null;
  confidence: number;
  tags: WeaknessTag[];
  text: string;
  checkAnswer: string;
};

async function submitVote(study: string, sid: string, caseKey: string, form: VoteForm): Promise<VoteResponse> {
  const res = await apiFetch("/jury/votes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studyKey: study,
      teracSubmissionId: sid,
      caseKey,
      merchantWins: form.merchantWins,
      confidence: form.confidence,
      weaknessTags: form.tags,
      ...(form.text.trim() ? { weaknessText: form.text.trim() } : {}),
      checkAnswer: form.checkAnswer,
    }),
  });
  const body: unknown = await res.json();
  if (!res.ok) {
    const parsed = errorResponseSchema.safeParse(body);
    throw new Error(parsed.success ? parsed.data.error.message : "could not save your vote");
  }
  return voteResponseSchema.parse(body);
}

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function CaseBody({ caseParams }: { caseParams: Promise<{ caseKey: string }> }) {
  const { caseKey } = use(caseParams);
  // the key remounts the form so every case starts with an empty vote
  return <CaseForm key={caseKey} caseKey={caseKey} />;
}

function CaseForm({ caseKey }: { caseKey: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const study = params.get("study") ?? "";
  const sid = params.get("sid") ?? "";
  const cases = (params.get("cases") ?? caseKey).split(",");
  const position = Math.max(cases.indexOf(caseKey), 0) + 1;
  const [view, setView] = useState<CaseView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<VoteForm>({ merchantWins: null, confidence: 4, tags: [], text: "", checkAnswer: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchCase(caseKey, study)
      .then(setView)
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "please reload"));
  }, [caseKey, study]);

  function goNext() {
    const next = cases[position];
    const query = `study=${encodeURIComponent(study)}&sid=${encodeURIComponent(sid)}&cases=${encodeURIComponent(cases.join(","))}`;
    // no next case in the list means the entry page resumes from the saved votes
    if (next) router.push(`/jury/${next}?${query}`);
    else router.replace(`/jury?study=${encodeURIComponent(study)}&teracSubmissionId=${encodeURIComponent(sid)}`);
  }

  function toggleTag(tag: WeaknessTag) {
    setForm((f) => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag] }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (form.merchantWins === null || !form.checkAnswer) {
      setError("please pick a winner and answer the check question");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitVote(study, sid, caseKey, form);
      if (result.redirectUrl) setRedirectUrl(result.redirectUrl);
      else goNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "could not save your vote");
      setSubmitting(false);
    }
  }

  if (loadError) return <p className="text-red-600">{loadError}</p>;
  if (!view) return <p>loading...</p>;

  if (redirectUrl) return <DoneNotice redirectUrl={redirectUrl} />;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <p className="rounded border border-amber-500/50 bg-amber-50 p-3 text-sm text-amber-900">
        this is a fictional scenario made up for a study. no real people or money are involved.
      </p>

      <section className="flex flex-col gap-2">
        <p className="text-sm font-semibold opacity-60">
          case {position} of {cases.length}
        </p>
        <h1 className="text-xl font-semibold">
          {view.reasonLabel}, {dollars(view.amountCents)}
        </h1>
        <h2 className="text-sm font-semibold uppercase opacity-60">customer says</h2>
        <p>{view.claimText}</p>
        <h2 className="text-sm font-semibold uppercase opacity-60">merchant replies</h2>
        <p className="whitespace-pre-wrap">{view.replyText}</p>
      </section>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-semibold">who should win this dispute?</legend>
        <label className="flex items-center gap-2 py-1">
          <input type="radio" name="winner" checked={form.merchantWins === false} onChange={() => setForm({ ...form, merchantWins: false })} />
          the customer
        </label>
        <label className="flex items-center gap-2 py-1">
          <input type="radio" name="winner" checked={form.merchantWins === true} onChange={() => setForm({ ...form, merchantWins: true })} />
          the merchant
        </label>
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="font-semibold">how confident are you? {form.confidence} of 7</span>
        <input type="range" min={1} max={7} value={form.confidence} onChange={(e) => setForm({ ...form, confidence: Number(e.target.value) })} />
        <span className="flex justify-between text-xs opacity-60">
          <span>1 not sure</span>
          <span>7 very sure</span>
        </span>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-semibold">what weakened the merchant&apos;s case? (pick any)</legend>
        {weaknessTags.map((tag) => (
          <label key={tag} className="flex items-center gap-2 py-1">
            <input type="checkbox" checked={form.tags.includes(tag)} onChange={() => toggleTag(tag)} />
            {tagLabels[tag]}
          </label>
        ))}
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="font-semibold">anything else? (optional)</span>
        <textarea
          rows={3}
          maxLength={2000}
          value={form.text}
          onChange={(e) => setForm({ ...form, text: e.target.value })}
          className="rounded border border-black/20 p-2"
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-semibold">{view.check.prompt}</legend>
        {view.check.options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 py-1">
            <input type="radio" name="check" checked={form.checkAnswer === option.value} onChange={() => setForm({ ...form, checkAnswer: option.value })} />
            {option.label}
          </label>
        ))}
      </fieldset>

      {error ? <p className="text-red-600">{error}</p> : null}
      <button type="submit" disabled={submitting} className="rounded bg-black px-4 py-3 text-white disabled:opacity-50">
        {submitting ? "saving..." : position < cases.length ? "save and go to the next case" : "submit my last vote"}
      </button>
    </form>
  );
}

export default function CasePage({ params }: { params: Promise<{ caseKey: string }> }) {
  return (
    <main className="mx-auto w-full max-w-xl p-4 sm:p-8">
      <Suspense fallback={<p>loading...</p>}>
        <CaseBody caseParams={params} />
      </Suspense>
    </main>
  );
}
