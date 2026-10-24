# F1 - Terac baseline jury study

Timebox: 45 min, launch as early as possible (slowest dependency). Done when: seed script generates 10 synthetic card disputes (digital goods) with ground-truth labels, v0 replies come from a plain one-shot LLM prompt, the jury page records votes, the Terac study is launched, and the study id is saved.

Hard prerequisite: F0 done list items 2 and 6 pass (api `/health` is 200 on the public URL, web deployed). Participants reach the jury page from Terac, so a laptop-only URL is not an option. If F0 is not deployed, stop and tell me.

Instructions for Claude Code (read first):

- Scope to F1 only. No evidence checklist, no v1 replies, no after-study, no Whop code.
- Scaffold with generator commands where they exist (prisma migrate, create-next-app already done), edit generated files directly, use the versions already installed.
- Check current docs before any Terac call. Docs checked 2026-10-24, listed in Part 2. If docs disagree with this file, docs win - tell me.
- If something is ambiguous or you see two valid approaches, stop and ask with 2-3 options and a pick. Do not guess.
- Never read, print or commit `.env` files. Secrets live in `.env` and the config class only.
- Code style: all lowercase comments in plain english, no decorative dividers, settings only through the config class, template-literal logging, small focused functions, money as integer cents.
- NEVER launch a Terac study without my explicit "launch" in chat. Creating a draft is free, launching commits funds.
- Stop at every step marked HUMAN and tell me exactly what to do.
- If any step runs 50% over its box, stop and tell me what to cut. Cut order: free-text weakness field, comprehension check, mobile polish.

## Part 1 - Planning

What it does: ten fictional card-dispute scenarios, each with a customer claim and a merchant reply written by a plain one-shot LLM prompt (version v0). A public jury page shows one scenario to one Terac participant, who votes on who should win, confidence 1-7, and what weakened the merchant's case. A Terac study sends General Population participants to that page. The page redirects back to Terac's callback so each submission is recorded as completed. Needs: F0 deployed, funded Terac org.

Core patterns: long-running tasks applies (the study takes hours, nothing holds a request open, we launch once and check results on demand). Contention applies in one spot (balanced case assignment, an atomic Redis counter). Realtime, scaling reads, scaling writes, large blobs, multi-step processes and proximity do not apply at 50 votes.

Entities and natural keys: Case (`key` like d07), Reply (`caseId`, `version`), Study (`key` like baseline-1), Assignment (`teracSubmissionId`), Vote (one per assignment). Not entities: the Terac participant (we only hold an opaque submission id), and the jury page session.

Object design: plain functions, plus the `LlmClient` interface with `AnthropicLlmClient` and `MockLlmClient` so tests run offline.

Concurrency: two participants landing at once must not both get the same slot, and a refresh must not create a second assignment. Redis `INCR` gives atomic round-robin, and the unique `teracSubmissionId` makes assignment and voting idempotent.

Decision log:

| decision | forced by | rejected |
|---|---|---|
| one case per participant, 5 votes per case, 50 participants | prompt spec, shorter task means lower price and faster fill | all 10 cases per participant: right eventually, wrong now (longer task, higher price, slower) |
| round-robin by Redis INCR | uneven votes per case at n=50 makes per-case numbers noise | random assignment: wrong at any scale for 10 fixed cases |
| omit `feasibility_request_id` | feasibility is priced out of band by a Terac teammate, auto estimate comes back in the create call | feasibility first: right when price control matters, wrong now (time) |
| our own jury page via Terac external task | documented path with redirect callback | native survey task type: not verified in docs |
| templated deterministic case facts, LLM only writes v0 prose | ground truth must be exact | LLM-generated cases: wrong at any scale |
| metrics split by ground truth | a better reply should not win cases the customer deserved | one blended number |

Open questions for me:

- Votes per case (default 5): confirm after I see the priced draft.
- Baseline and after studies may reach the same participants and we cannot exclude them. Check the opportunity fields for a repeat-participant limit, otherwise I accept it and disclose it in the submission.
- Budget: the hackathon gives $100 of Terac credit in total, shared by this baseline study, the F5 after-study and any escalation jury. Cap for this study is $40 all-in (`pricing.total_cost_cents` on the draft, which already includes the platform fee). Keep $60 for the after-study and a small reserve.

## Part 2 - Spec

Version targets: Terac REST `https://terac.com/api/external/v2`, `Authorization: Bearer <key>`, docs read 2026-10-24 (createOpportunity, requestFeasibility, external-surveys integration page). Terac MCP `https://terac.com/api/mcp`, tools `terac_create_opportunity`, `terac_launch_draft_opportunity`, `terac_get_submissions`. LLM model string in config `LLM_MODEL`, confirm the current Sonnet string in Anthropic docs. Other versions are the ones recorded in `docs/F0-scaffolding.md`.

Terac facts that shape the build:

- Participants arrive at `task_url` with `teracSubmissionId` and `taskId` appended. Keep `task_url` free of its own query string except `study`, and read the external-surveys page to confirm how Terac merges them.
- End of task: redirect the browser to `https://terac.com/api/external/callback?teracSubmissionId=<id>&result=completed`. Without a callback, a submission waiting for review is auto-rejected after 6 hours, so show a visible fallback link as well as the auto redirect.
- Pay is derived, never sent. Read `pricing` and `funding` from the draft response before anyone is told a price.
- A create is rejected unless it carries `filters` or `unrestricted_audience: true`. General Population here means `unrestricted_audience: true` (US, 18+, any language) with `business_type: "b2c"`. Call `GET /filters` first and report if a closer General Population option exists.
- A launch needs a screener. Screening is unpaid, so it holds one qualifying question and no research questions.
- `expected_days_to_complete` minimum is 5. It is a deadline, not an expected duration. Stop the opportunity once enough votes are in.

Schema:

```prisma
model Case {
  id          String   @id @default(uuid(7))
  key         String   @unique                 // case view by key
  reason      String                           // fraud, not_received, not_as_described, subscription_canceled, duplicate, credit_not_processed
  amountCents Int
  claimText   String
  factsJson   Json                             // internal proof facts, never sent to the browser
  merchantShouldWin Boolean                    // ground truth label
  replies     Reply[]
  createdAt   DateTime @default(now())
}

model Reply {
  id        String @id @default(uuid(7))
  caseId    String
  case      Case   @relation(fields: [caseId], references: [id])
  version   String                              // v0 now, v1 in F5
  text      String
  model     String
  @@unique([caseId, version])                   // fetch reply for a study's version
}

model Study {
  id                 String   @id @default(uuid(7))
  key                String   @unique           // resolve study from the jury url
  round              String                      // baseline or after
  replyVersion       String
  targetVotesPerCase Int
  teracOpportunityId String?  @unique
  status             String                      // draft, launched, closed
  launchedAt         DateTime?
}

model Assignment {
  id                String   @id @default(uuid(7))
  studyId           String
  caseId            String
  teracSubmissionId String   @unique             // sticky assignment and idempotency
  createdAt         DateTime @default(now())
  @@index([studyId, caseId])                     // votes-per-case progress check
}

model Vote {
  id            String   @id @default(uuid(7))
  assignmentId  String   @unique                 // one vote per assignment
  studyId       String
  caseId        String
  merchantWins  Boolean
  confidence    Int
  weaknessTags  String[]
  weaknessText  String?
  checkPassed   Boolean
  createdAt     DateTime @default(now())
  @@index([studyId, caseId])                     // metrics aggregation later
}
```

API contract (zod in `packages/shared`, error shape `{ error: { code, message } }`):

| endpoint | request | success | errors |
|---|---|---|---|
| `POST /jury/assignments` | `{ studyKey, teracSubmissionId, taskId? }` | 200 `{ caseKey }`, same answer on repeat | 404 unknown study, 409 study closed, 503 `ASSIGNMENT_UNAVAILABLE` |
| `GET /jury/cases/:caseKey?study=` | none | 200 `{ caseKey, reasonLabel, amountCents, claimText, replyText, check: { prompt, options } }` | 404 |
| `POST /jury/votes` | `{ studyKey, teracSubmissionId, merchantWins, confidence 1-7, weaknessTags[], weaknessText?, checkAnswer }` | 201 first time, 200 on repeat, body `{ redirectUrl }` | 400, 404, 409 no assignment |

`GET /jury/cases` never returns `factsJson`, `merchantShouldWin` or the correct check answer. Weakness tags are a fixed enum: `no_proof_of_use`, `reply_too_vague`, `proof_does_not_match_claim`, `policy_not_shown_before_purchase`, `dates_or_amounts_dont_add_up`, `tone`, `nothing_weak`.

Config additions: `PUBLIC_WEB_URL`, `TERAC_CALLBACK_URL` (default Terac's callback), `LLM_MODEL`, `JURY_VOTES_PER_CASE` (default 5).

The ten cases (facts are templated in code, amounts integer cents):

| key | reason | amount | merchant should win | key facts |
|---|---|---|---|---|
| d01 | fraud | 3900 | yes | buyer email matches account, 11 logins over 6 days from the purchase IP and device |
| d02 | fraud | 8900 | no | purchase IP in another country, new device, email differs from account email by one letter, no logins |
| d03 | not_received | 2400 | yes | download link emailed, 3 downloads logged within 10 minutes of purchase |
| d04 | not_received | 5900 | no | delivery email bounced, no access logs, license key never activated |
| d05 | not_as_described | 12900 | yes | checkout page listed 6 modules, customer opened all 6, completed 5 |
| d06 | not_as_described | 4900 | no | page said works with v5 and v6, only v5 delivered, support emails confirm the gap |
| d07 | subscription_canceled | 1900 | yes | cancel request 2 days after the charge, policy at checkout said cancellation applies next cycle |
| d08 | subscription_canceled | 1900 | no | customer cancelled 6 days before the charge, confirmation email exists, charged anyway |
| d09 | duplicate | 1500 | yes | two charges same day, distinct order ids for two different products |
| d10 | credit_not_processed | 7900 | yes | 14-day refund policy shown at checkout, refund requested on day 31 and declined |

Edge cases:

- Participant refreshes or reopens the link: same assignment, same case, no second row.
- Double click on submit: one vote, second call returns 200 with the same `redirectUrl`.
- Tab closed before the redirect: vote is saved, the fallback link is the only path, Terac may auto-reject after 6 hours.
- Redis down at assignment: 503, no row written, page says to reload in a minute.
- LLM timeout or bad reply during seed: retry once, then fail the seed with the case key. Replies are written in one transaction per case so no half-seeded case.
- v0 reply fails the fact check (wrong amount or missing order reference): regenerate once, then fail loudly.
- Terac create returns 4xx or 5xx: stop, report the body, nothing launched.
- `funding.affordable` is false: stop and report `shortfall_cents`.

Non-goals: after-study, v1 replies, evidence checklist, metrics script (small separate chunk once votes exist), Terac webhooks, jury page auth, results pages, Whop code.

## Part 3 - Trace

Terac sends a participant to:

`https://<web-domain>/jury?study=baseline-1&teracSubmissionId=sub_8f2k9d41&taskId=tsk_01`

Hops:

1. Next `/jury` page reads the params and calls `POST /jury/assignments` with `{ "studyKey": "baseline-1", "teracSubmissionId": "sub_8f2k9d41", "taskId": "tsk_01" }`.
2. Express looks up `Assignment.teracSubmissionId`, finds nothing, runs `INCR jury:rr:baseline-1` which returns 7, picks case index (7-1) mod 10, which is d07, inserts the Assignment, returns `{ "caseKey": "d07" }`.
3. Web routes to `/jury/d07?study=baseline-1&sid=sub_8f2k9d41` and calls `GET /jury/cases/d07?study=baseline-1`. Response carries `amountCents: 1900`, the claim, the v0 reply text and the check question.
4. Participant votes: `{ "merchantWins": false, "confidence": 5, "weaknessTags": ["reply_too_vague"], "checkAnswer": "monthly" }` to `POST /jury/votes`. A Vote row is inserted and the response is `{ "redirectUrl": "https://terac.com/api/external/callback?teracSubmissionId=sub_8f2k9d41&result=completed" }`.
5. Browser redirects, Terac marks the submission completed.

Failure path, Redis down at hop 2: `INCR` throws, no Assignment row is written, response is 503 `ASSIGNMENT_UNAVAILABLE`, the page shows a reload message. Reload repeats hop 2 from scratch, so nothing is double counted.

## Runbook (execute in order)

1. Prerequisite check: confirm F0 done items 2 and 6 and that `ANTHROPIC_API_KEY` is set. `TERAC_API_KEY` is only needed from step 10, so do not stop for it. If the others are missing, stop.
2. Shared schemas in `packages/shared`: assignment, case view, vote request and response, weakness tag enum, error shape.
3. Prisma schema above in `apps/api`, then `pnpm exec prisma migrate dev --name jury_baseline`. Prisma init and config were created in F0, follow what they use.
4. `src/llm/`: `LlmClient` interface, `AnthropicLlmClient`, `MockLlmClient`. Add vitest if no test runner exists.
5. `src/seed/cases.ts` with the ten templated cases, `src/seed/seed.ts` that upserts Cases by key, creates the `baseline-1` Study (round baseline, replyVersion v0, status draft), and writes v0 replies with one plain one-shot prompt per case. Fact check each reply against amount and order reference. Seed is idempotent, rerunning skips existing replies. Unit tests: ten cases, 6 merchant-should-win and 4 not, amounts are integers, fact checker rejects a wrong amount, mock client path works offline.
6. Endpoints in the contract table. Then test with curl against the real backend, no UI, and paste me the outputs for the done list items 3 to 6.
7. Web: `/jury` entry page and `/jury/[caseKey]` page. Plain Tailwind, readable on a phone. Top of page says the case is a fictional scenario. Form has winner, confidence 1-7, weakness checkboxes, optional text, one comprehension check. Auto redirect after submit plus a visible fallback link.
8. Deploy: push, run migrations on the Railway database, run the seed against it. HUMAN if the Railway CLI is not logged in, give me the exact command to run.
9. Public smoke test with a throwaway submission id that is not a real Terac id. Do not call Terac's callback with a fake id.
10. If I have no Terac research org or API key yet, skip steps 10 and 11, finish everything else, and tell me. Otherwise, Terac draft through the MCP tools: `GET /filters` check, project (create "Receipts" if none), title "Judge a payment dispute: 5-minute online task", `num_participants` sized to the $40 cap (start from 10 x votes per case, read `pricing` on the draft first, and if the total is over the cap lower votes per case, minimum 3, and tell me before going lower or changing the design), `business_type` b2c, `unrestricted_audience` true, `expected_days_to_complete` 5, screener with one qualifying question (bought or subscribed to a digital product online in the past 12 months, yes qualifies, no rejects), one task with `task_url` = `<PUBLIC_WEB_URL>/jury?study=baseline-1`, `duration_minutes` 5, `customer_screening_review` auto_invite, task type and review type from the TypeScript definitions on the docs page. Fall back to REST only if the MCP tool cannot express a field, and tell me. Then print `pricing` and `funding`. STOP. HUMAN: I say "launch" or change the numbers.
11. After my go: launch through the MCP, record the opportunity id with a small script into `Study.teracOpportunityId` and set status launched. Update this file's Part 2 with the actual pricing and the resolved model string.

## Done list

1. `pnpm turbo run typecheck` and `pnpm --filter api test` pass.
2. `select count(*) from "Case"` is 10, `select count(*) from "Reply" where version = 'v0'` is 10, and `merchantShouldWin` counts are 6 and 4.
3. `curl -X POST .../jury/assignments` twice with the same `teracSubmissionId` returns the same `caseKey` both times, and the Assignment table has one row for it.
4. Posting 10 assignments with distinct ids returns each case exactly once.
5. `POST /jury/votes` twice with the same payload returns 201 then 200, Vote table has one row, and the response `redirectUrl` ends with `result=completed`.
6. Infra failure check: `docker compose stop redis`, then `POST /jury/assignments` returns 503 `ASSIGNMENT_UNAVAILABLE` and writes no row. Restart redis after.
7. `GET /jury/cases/d02` response contains no `factsJson`, no `merchantShouldWin` and no correct check answer.
8. Public URL: jury page loads on a phone-width viewport and the submit path reaches the redirect step.
9. Draft exists on Terac with `pricing` and `funding` printed and `funding.affordable` true. Launch happened only after my explicit go.
10. `Study.teracOpportunityId` is saved and status is launched.
11. Launch plus 30 minutes: `terac_get_submissions` shows at least one participant in progress and the Vote table has rows. If there are zero by launch plus 60 minutes, pause the opportunity and tell me.