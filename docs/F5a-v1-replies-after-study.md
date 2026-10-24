# F5a - v1 replies and the after-study

Timebox: 40 min, target done by 3:15 PM. This is the slice of F5 that the Terac before/after depends on. The paid dispute pack (intake form, PDF, ESCALATE jury) is F5b and is not in this file.

Done when: all 10 cases have a v1 reply produced by the deterministic checklist plus a fact-checked LLM write-up, an `after-1` study row exists, and a priced, unlaunched Terac draft for the after-study is ready.

Instructions for Claude Code (read first):

- Scope to F5a only. No Whop code, no intake form, no PDF, no outbound.
- Same rules as F1: check Terac docs before any Terac call, ask if two valid approaches exist, never read or print `.env`, lowercase plain-english comments, config class for settings, money in integer cents, success-path checks only (no failure tests, I have no time).
- NEVER launch the after-study without my explicit "launch". Also do not launch before the baseline has at least one completed, approved submission (gate in step 8).
- Stop at every HUMAN step.
- If any step runs 50% over, stop and tell me what to cut. Cut order: orchestrator accuracy printout, length matching, unit tests beyond the 10-case table.

## Part 1 - Planning

What it does: turns each case's proof facts into a deterministic checklist (per dispute reason, which proof items exist, which are missing, which contradict the claim), runs an ordered rule list that returns DISPUTE, ACCEPT or ESCALATE plus the rule that fired, and has the LLM write only the prose from the validated items. The same 10 cases and the same 7 x 4 design are then shown to a fresh set of Terac participants. Only the reply changes. Needs: F1 built, `Reply.v0` rows, baseline launched.

Core patterns: multi-step processes applies (checklist, decision, write-up, fact check, store), long-running tasks applies (the study), the rest do not.

Entities and natural keys: `Reply (caseId, version=v1)` already exists as a model, `Study (key=after-1)`. Not an entity: the checklist result, it is derived and stored as JSON on the reply.

Object design: Strategy per dispute reason (one pure function each returning checklist items), plain functions elsewhere.

Concurrency: seeding is idempotent on `(caseId, version)`, nothing else is contended.

Decision log:

| decision | forced by | rejected |
|---|---|---|
| LLM never decides, checklist rules decide | the design principle, and labels exist to score it | LLM picks dispute or accept: wrong at any scale |
| v1 writer is told to be truthful, so customer-should-win cases read as weak or conceding | a reply that wins cases the customer deserved is manipulation, not improvement | v1 always argues to win: wrong at any scale |
| v1 length within 15% of the v0 reply for the same case | longer replies win votes on length alone, which would fake the lift | unconstrained length: wrong at any scale |
| launch the after-study without waiting for baseline results | 6:45 PM lock, baseline results arrive too late to build on | wait for baseline feedback: right eventually, wrong now |
| exclude baseline participants with `has_not_taken_study` | the same person judging the same case twice contaminates the comparison | accept overlap and disclose: wrong when a filter exists |

Open questions for me: none.

## Part 2 - Spec

Version targets: Terac REST and MCP as used in F1 (draft tool, launch tool, `has_not_taken_study` filter found in F1). Model string from `LLM_MODEL`. Other versions in `docs/F0-scaffolding.md`.

Ordered rules per dispute reason, evaluated on `Case.factsJson` (map to the keys Claude Code created in F1; if a key does not exist, add it to the case template and reseed facts only, not v0 replies):

| reason | required proof items | DISPUTE when | ACCEPT when | otherwise |
|---|---|---|---|---|
| fraud | purchase email equals account email, access after purchase from purchase IP or device, no country mismatch | all three hold | email differs and country mismatches and no access | ESCALATE |
| not_received | delivery email delivered, access or download logged after purchase | delivered and at least one access | delivery bounced and zero access | ESCALATE |
| not_as_described | checkout description matches delivered product, usage after purchase | description matches and usage logged | documented mismatch between description and delivery | ESCALATE |
| subscription_canceled | cancellation policy shown before purchase, cancel timestamp vs charge timestamp | policy shown and cancel after charge | cancel before charge with confirmation | ESCALATE |
| duplicate | distinct order ids, different products | ids distinct and products differ | same order id | ESCALATE |
| credit_not_processed | refund policy shown before purchase, refund request vs policy window | policy shown and request after the window | request inside the window and no refund issued | ESCALATE |

Expected decisions on the ten cases: DISPUTE for d01, d03, d05, d07, d09, d10 and ACCEPT for d02, d04, d06, d08. These match the ground-truth labels, so the printout is "matches labels on synthetic cases", not a real-world accuracy claim.

Schema change: `Reply.meta Json?` holding `{ decision, rule, items: [{ item, status: present|missing|contradicts, value }] }`. One migration, no new indexes (reads stay `(caseId, version)`).

v1 writer: input is only the checklist items and the claim. Required content: name the dispute reason and amount, one sentence per present proof item with its exact value (timestamps, counts, ids, amounts), policy disclosure where the case has one, a closing request that matches the decision. Forbidden: anything not in the items, any number not in the items. For ACCEPT cases the reply states plainly that the merchant does not contest and why. Fact check: amount in dollars and every id and date from the items must appear, no extra numbers, word count within 15% of the v0 reply, one retry then fail with the case key.

Study row `after-1`: round after, replyVersion v1, 7 participants, 4 cases each, 3 votes per case ceiling, redis counter key `jury:rr:after-1`. The jury page already picks the reply by the study's `replyVersion`, confirm with curl.

Terac after-study draft: same title, description, 8-minute interview task, screener and `task_url` pattern as baseline but `task_url` = `<PUBLIC_WEB_URL>/jury?study=after-1`. The create call rejects `unrestricted_audience` together with `filters`, so replace it with explicit filters for the base audience (country US, age 18 and over) plus the `has_not_taken_study` filter pointing at baseline opportunity `gza0yevon3thzw38womhw624`. Read the exact filter shape from `GET /filters` first. Price will be re-read from the draft, expect about $6.00 each, $42.00 total, balance after is about $16.

Edge cases: if a v1 reply fails its fact check twice, stop and report the case key and the failing check. If the `has_not_taken_study` filter cannot be combined with the base audience, stop and tell me the exact error.

Non-goals: intake form, PDF, escalation jury, Whop code, metrics script (built when votes exist), v2 replies.

## Part 3 - Trace

Case d07 (subscription_canceled, $19.00), facts: policy shown at checkout, charge at 2026-10-12T14:03Z, cancel request at 2026-10-14T09:41Z.

1. Checklist: `policy_shown` present, `cancel_after_charge` present with value 2 days, no contradictions.
2. Rule list: subscription_canceled DISPUTE rule fires, decision DISPUTE, `meta` stored.
3. Writer input is those two items plus the customer claim and the v0 word count of 112, target 95 to 129 words.
4. Reply states the $19.00 charge on the date, quotes the cancellation terms shown before purchase, notes the cancel came two days after the charge, and requests the dispute be resolved in the merchant's favor. Fact check passes, stored as `Reply(d07, v1)`.
5. A participant on `after-1` is assigned 4 cases and sees the v1 text for d07.

## Runbook (execute in order)

1. Migration adding `Reply.meta`.
2. `src/checklist/`: one Strategy function per reason, the ordered rule list, types. Unit test that the ten cases produce the expected decisions in the table above.
3. `src/reply/v1.ts`: prompt builder from checklist items only, fact check, length check against the stored v0 reply, one retry.
4. `seed:v1` script, idempotent on `(caseId, version)`, that writes the ten v1 replies with `meta` and prints a table: case key, decision, expected decision, v0 words, v1 words.
5. HUMAN: write all ten v0 and v1 pairs to `docs/v0-vs-v1.md` and tell me. I will skim at least d02, d05 and d08 before any money is spent.
6. Create the `after-1` study row (seed parameter, not a hand edit). Confirm with curl that `GET /jury/cases/d07?study=after-1` returns the v1 text and `?study=baseline-1` still returns v0.
7. Create the after-study Terac draft through the MCP with the filters above. Print `pricing` and `funding`. STOP.
8. Launch gate: launch only after I say "launch" AND `pnpm --filter @receipts/api progress` shows at least one completed baseline participant and Terac shows that submission approved. If neither is true by 3:15 PM, tell me and wait.
9. After launch: record the opportunity id in `Study.teracOpportunityId`, set status and `launchedAt`, update this file with the real pricing, commit and push, print the progress output for both studies.

## Done list

1. `pnpm --filter @receipts/api test` passes, including the ten-case decision table.
2. `seed:v1` prints 10 rows, every decision equals its expected decision, and every v1 word count is within 15% of its v0.
3. `select count(*) from "Reply" where version = 'v1'` is 10.
4. `curl` for `d07` with `study=after-1` returns v1 text, with `study=baseline-1` returns v0 text.
5. `docs/v0-vs-v1.md` exists and I have skimmed it.
6. After-study draft exists with `funding.affordable` true and the exclusion filter present.
7. Launch happened only after my "launch" and after the baseline gate passed.
8. `Study.teracOpportunityId` is saved for `after-1`.
