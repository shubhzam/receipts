# F4 - Outbound agent (draft only, human sends)

Timebox: 45 min, target done by 5:30 PM. The agent finds leads with Exa, extracts a business contact address, writes a short personalized email, and queues it as a draft. A person reviews each draft and presses send in their own mail app, then marks it sent. Every step is logged.

Done when: one campaign run produces up to 25 draft emails from real leads, each with an opt-out line, a mailing address and a tracked link, the `/outbound` page lists them with "open in mail" and "mark sent", and every step is in the AgentEvent trail.

Hard gate: do not hand me any draft to send until live mode is on (step 1). The checkout currently runs on the Whop sandbox, which cannot take real cards, so a real seller who clicked buy would hit a dead end.

Instructions for Claude Code (read first):

- Scope to F4 only. No sending from code in this version, no store check-up, no autoposting anywhere.
- Same rules as before: check docs before any Exa call (read the installed `exa-js` types), ask if two valid approaches exist, never read or print `.env`, lowercase plain-english comments, config class for settings, success-path checks only.
- Business contact addresses only. Reject free-mail domains (gmail, yahoo, outlook, hotmail, icloud, proton, aol) and any address that looks personal. Prefer generic role addresses (support, hello, contact, info, sales, team, hi).
- Cap of 25 drafts per run. Do not raise it without asking me.
- Never invent facts, statistics or testimonials in any email. The email may only claim things that are true of our product today.
- An opt-out line and a real mailing address are required in every email.
- Stop at every HUMAN step.
- If a step runs 50% over, stop and tell me what to cut. Cut order: LLM personalization (use a fixed template with the site name), `/outbound` page polish.

## Part 1 - Planning

What it does: finds small online sellers of digital products who likely face chargebacks, gets a public business contact address for each, writes a short email in plain language that says what Receipts does, links to the free preview with a lead reference, and queues it as a draft. A person sends it. The page then records the send. Needs: F2 live, Exa key.

Core patterns: multi-step processes (find, extract, filter, write, queue, send, log). Long-running tasks applies only lightly (a run takes a minute or two, run it as a script). The rest do not apply.

Entities and natural keys: `Lead` (domain, one per campaign), `OutboundMessage` (lead and campaign, one per pair), `Suppression` (an email or domain that must never be contacted). Not an entity: the contact address, it is a field on the lead.

Object design: a `Sender` interface with `DraftOnlySender` now. An `SmtpSender` can replace it later without touching the rest. Plain functions otherwise.

Concurrency: running the campaign twice must not create duplicate drafts. Idempotency key is `(domain, campaign)`.

Decision log:

| decision | forced by | rejected |
|---|---|---|
| draft only, human marks sent | no sending account today | automatic send: right eventually, wrong now |
| LLM writes only two personalized sentences, everything else is fixed text | the opt-out line, address, link and claims must be exact | LLM writes the whole email: wrong at any scale |
| facts in the personalization must come from the Exa page summary | no fabricated claims | free-form flattery: wrong at any scale |
| `Suppression` checked before every draft | opting out must always hold | skip the list: wrong at any scale |
| free-mail domains rejected | business addresses only, from the guardrails | accept any address: wrong at any scale |

Open questions for me: none.

## Part 2 - Spec

Version targets: `exa-js` as installed, docs read before coding. Model from `LLM_MODEL`.

Config additions: `OUTBOUND_MAILING_ADDRESS` (required, a real postal address I provide), `OUTBOUND_FROM_NAME`, `OUTBOUND_CAMPAIGN` (default `genpop-1`), `OUTBOUND_RUN_CAP` (default 25), `PUBLIC_WEB_URL` (exists).

Lead search: Exa queries aimed at small stores and creators selling digital goods (templates, courses, software, ebooks, subscriptions) with a visible refund or support page. Use a few different queries and de-duplicate by domain. Read each result's title and summary only, do not crawl sites ourselves. Look for a public contact address in the returned page text.

Schema:

```prisma
model Lead {
  id        String   @id @default(uuid(7))
  campaign  String
  domain    String
  name      String
  summary   String                         // exa summary used for personalization
  email     String?                        // business contact address, null when none found
  createdAt DateTime @default(now())
  @@unique([campaign, domain])             // idempotency on (domain, campaign)
}

model OutboundMessage {
  id        String   @id @default(uuid(7))
  leadId    String   @unique
  lead      Lead     @relation(fields: [leadId], references: [id])
  subject   String
  body      String
  status    String                         // drafted, sent, skipped
  sentAt    DateTime?
  createdAt DateTime @default(now())
  @@index([status, createdAt])             // outbound page lists drafts first
}

model Suppression {
  id    String @id @default(uuid(7))
  value String @unique                     // an email or a domain
}
```

Email shape (fixed parts in code, two sentences from the writer):

- Subject: `Chargeback replies for {name}`.
- Opening: one line saying who we are and why we are writing, naming what the site sells in the writer's two sentences.
- Product line: Receipts checks a seller's proof against fixed rules and writes the bank reply, or tells them to accept the dispute when the proof is too weak. Free preview before paying, $29 if they want the written reply.
- Link: `<PUBLIC_WEB_URL>/start?ref=<lead id>`.
- Footer: `OUTBOUND_MAILING_ADDRESS`, and: "If you would rather not hear from us, reply stop and we will not email you again."
- Banned in any email: made-up numbers, testimonials, claims about results from the Terac study unless the real numbers exist and I approve the sentence.

Endpoints (no auth, behind an obvious path, this is a demo):

| endpoint | request | success |
|---|---|---|
| `GET /outbound` | none | 200 drafts first, then sent, with lead name, domain, email, subject, body, a prefilled `mailto:` link |
| `POST /outbound/:id/sent` | none | 200, status `sent`, `sentAt` set, `message_marked_sent` event |
| `POST /outbound/:id/skip` | none | 200, status `skipped` |
| `POST /suppressions` | `{ value }` | 201, future runs skip it |

Edge cases: a lead with no usable business email is saved with `email = null` and skipped with an event, no draft. A lead whose email or domain is suppressed is skipped. Exa returns fewer than 25 usable leads: draft what exists, never pad. Exa error mid-run: stop, keep what was saved, report. Rerunning the campaign creates no duplicate drafts.

Non-goals: sending from code, replies handling, sequences or follow-ups, scraping beyond Exa results, personal email addresses, social posts.

## Part 3 - Trace

Query: small stores selling digital templates with a public refund page. Exa returns a result for a template shop with the summary "sells Notion and Figma templates with a 30-day refund policy" and the contact address `support@pixelnook.example`.

1. Lead saved: campaign `genpop-1`, domain `pixelnook.example`, event `lead_found`.
2. Address check: business domain, role address, not suppressed, event `email_extracted`.
3. Writer gets only the summary and writes two sentences, for example "I saw Pixelnook sells templates with a 30-day refund policy. Digital goods like that tend to attract chargebacks that are easy to lose by replying without the right proof."
4. Fixed parts are added, the draft is stored, event `draft_written`.
5. `/outbound` shows it. I open it in my mail app, read it, send it, press mark sent. Event `message_marked_sent`.

## Runbook (execute in order)

1. Live mode switch. Make the "test mode" note on the buy box depend on the Whop environment (config value, not a code edit). Then HUMAN: I create the live Whop business key and webhook. Steps: live API key with the same permissions as the sandbox one, a live webhook at `https://carat-scotch-limes.ngrok-free.dev/webhooks/whop` for `payment.succeeded`, then I set `WHOP_API_KEY`, `WHOP_ACCOUNT_ID`, `WHOP_WEBHOOK_SECRET` and `WHOP_BASE_URL=https://api.whop.com/api/v1` in `.env` and restart. After that: call `accounts/me` on live and report `capabilities.accept_card_payments`, create one live checkout configuration through the api for a throwaway order, open nothing and pay nothing, and report that it returned a `purchase_url` on whop.com. Never pay it.
2. Migration for the three models, config keys appended with empty values (do not print `.env`).
3. Lead finder (Exa queries, domain dedupe, email extraction and filtering, suppression check) as a script `outbound:find` with the cap. Print a table of leads found, emails kept and reasons for skips.
4. Writer: two-sentence personalization from the summary only, fixed template around it, a check that the draft contains the link, the opt-out line and the address and no digits that are not in the fixed text.
5. `outbound:run` script that does find, write and queue, with AgentEvents for every step. Run it with the cap and print the drafts.
6. HUMAN: I read the drafts and fix the mailing address if needed.
7. `/outbound` page and the three endpoints. Commit and push.

## Done list

1. `pnpm turbo run typecheck` and the api tests pass.
2. After step 1, live `accounts/me` reports the live business, and a live checkout url exists. Nothing was paid.
3. `outbound:run` produced between 1 and 25 drafts, each with a business email on a non-free-mail domain.
4. Every draft contains the link with the lead ref, the opt-out line and the mailing address, and no invented numbers.
5. Running `outbound:run` a second time creates no new drafts.
6. `/outbound` lists the drafts, and marking one sent sets `sentAt` and writes an event.
7. `/trail` shows `lead_found`, `email_extracted` and `draft_written` events.
