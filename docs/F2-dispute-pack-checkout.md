# F2 - Dispute reply pack: landing, intake, free preview, Whop checkout, fulfillment

Timebox: 60 min, target done by 4:15 PM. One product only: the dispute reply pack at $29 per dispute. The store check-up (F3) and the autopilot (F6) are cut. Outbound (F4) comes after this.

Done when: a seller can open the landing page, fill the intake for one dispute, see a free deterministic preview, pay $29 in the Whop sandbox, and land on a results page that shows the written reply once the webhook has marked the order paid and the worker has fulfilled it. Every step writes an `AgentEvent`.

Instructions for Claude Code (read first):

- Scope to F2 only. No outbound, no store check-up, no PDF library (browser print is the PDF), no autopilot.
- Same rules as before: check Whop docs before any Whop call (read `@whop/sdk` types, the installed version wins over this file), ask if two valid approaches exist, never read or print `.env` (append new keys only, do not echo values), lowercase plain-english comments, config class for every setting, money in integer cents, success-path checks only.
- NEVER make a real payment. The hackathon forbids buying our own product. Sandbox test cards only. Do not pay on the live site, ever.
- Never store card numbers. Reject any free-text intake field that contains a 13 to 19 digit sequence.
- Stop at every HUMAN step.
- If a step runs 50% over, stop and tell me what to cut. Cut order: `/trail` page (keep the AgentEvent writes), preview rate limit, print stylesheet.

## Part 1 - Planning

What it does: a seller with an open chargeback fills a structured intake (dispute reason, amount, order reference, dates, and for each proof item whether they have it and its value). The api runs the F5a checklist and rule list immediately and shows the result as a free preview: the decision and which proof items are present, missing or contradicting. Only DISPUTE and ESCALATE previews show a buy button. An ACCEPT preview says the proof is too thin to win and recommends accepting, with no checkout offered. Paying runs the F5a v1 writer in the worker and delivers the reply. Needs: F5a code, F1 api, Whop sandbox key.

Core patterns: multi-step processes (intake, preview, checkout, payment, fulfillment), long-running tasks (the worker), contention (the webhook can arrive twice or race the redirect).

Entities and natural keys: `Order` (public `token`), `AgentEvent` (append only). Not entities: the intake and the result, they are JSON on the order. `OrderStatus` is a state machine: `draft`, `pending_payment`, `paid`, `fulfilled`, `failed`, with a transition map that rejects anything else.

Concurrency: a retried or duplicate webhook must not double-fulfill. Idempotency keys: `whopPaymentId` unique on the order, a conditional update `pending_payment` to `paid`, and the BullMQ job id `fulfill-<orderId>`.

Decision log:

| decision | forced by | rejected |
|---|---|---|
| free preview is the deterministic checklist only, no LLM | no LLM cost per anonymous visitor, and the design principle | free LLM reply: wrong at any scale |
| ACCEPT previews offer no checkout | selling a reply for an unwinnable dispute is not honest | sell anyway: wrong at any scale |
| fulfill only from the webhook, never from the redirect | Whop's docs say so, the buyer can close the tab | fulfill on redirect: wrong at any scale |
| results page polls order status by token every 2s | webhook may land after the buyer does | websocket: right eventually, wrong now |

Open questions for me: none.

## Part 2 - Spec

Version targets: `@whop/sdk` as installed in F0 (read its types first, the client class and option names may differ from docs examples), Standard Webhooks verification through `unwrapWebhook` from `@whop/sdk/helpers`, Whop docs read 2026-10-24.

Whop facts that shape the build:

- Checkout: `POST /checkout_configurations` with `account_id` (`biz_`), an inline `plan` (`plan_type: "one_time"`, `initial_price` in dollars as a number, `currency: "usd"`, `title`), `metadata`, and `redirect_url`. Send an `Idempotency-Key` header equal to the order id. The response has `id` (`ch_`) and `purchase_url`.
- Webhook: Standard Webhooks, signed with the `ws_...` secret in `WHOP_WEBHOOK_SECRET`. Verify against the raw body, respond 2xx in under 5 seconds, delivery is at least once and retried for about 3 days, order is not guaranteed. `payment.succeeded` carries the payment object with the `metadata` set on the checkout configuration.
- The sandbox and the live site have separate dashboards, keys, webhooks and secrets. Sandbox test card: 4242 4242 4242 4242, any future expiry, any CVC.
- The redirect after checkout is a convenience. The results page must work with no query params and read only our own order state.

Config additions: `WHOP_ACCOUNT_ID` (the `biz_` id, sandbox now), `WHOP_WEBHOOK_SECRET`, `DISPUTE_PACK_PRICE_CENTS` (default 2900). Existing: `PUBLIC_WEB_URL`, `WHOP_BASE_URL`, `WHOP_API_VERSION_DATE`.

Schema:

```prisma
model Order {
  id               String   @id @default(uuid(7))
  token            String   @unique          // results page and status poll by token
  status           String                    // draft, pending_payment, paid, fulfilled, failed
  priceCents       Int
  intake           Json
  preview          Json                      // { decision, rule, items }
  result           Json?                     // { replyText, decision, rule, items }
  whopCheckoutId   String?
  whopPaymentId    String?  @unique          // webhook idempotency
  paidAt           DateTime?
  fulfilledAt      DateTime?
  createdAt        DateTime @default(now())
  events           AgentEvent[]
}

model AgentEvent {
  id        String   @id @default(uuid(7))
  orderId   String?
  order     Order?   @relation(fields: [orderId], references: [id])
  step      String                           // intake_received, preview_computed, checkout_created, payment_confirmed, job_queued, checklist_run, reply_written, fact_check_passed, order_fulfilled
  reasoning String                           // one or two plain sentences, no secrets, no card data
  createdAt DateTime @default(now())
  @@index([createdAt])                       // trail page lists latest events
  @@index([orderId, createdAt])              // events for one order
}
```

API contract (zod in `packages/shared`, error shape `{ error: { code, message } }`):

| endpoint | request | success | errors |
|---|---|---|---|
| `POST /orders` | intake JSON | 201 `{ token, preview }`, order `draft` | 400 invalid intake or card-like digits, 429 preview rate limit |
| `POST /orders/:token/checkout` | none | 200 `{ purchaseUrl }`, order `pending_payment`, same url on repeat | 404, 409 if preview decision is ACCEPT or order already paid |
| `GET /orders/:token` | none | 200 `{ status, preview, result? }`, result only when `fulfilled` | 404 |
| `POST /webhooks/whop` | raw body, Standard Webhooks headers | 200 always after a valid signature | 400 bad signature |
| `GET /events?limit=50` | none | 200 latest events, tokens masked | none |

Edge cases: a duplicate `payment.succeeded` returns 200 and changes nothing. A webhook for an unknown or already-paid order returns 200 and logs an AgentEvent. The buyer lands on `/r/<token>` before the webhook, so the page shows "waiting for payment confirmation" and keeps polling. Redis down at enqueue: the order stays `paid` and an AgentEvent notes it. If the paid amount in the payment object is lower than `priceCents`, mark `failed` and log it.

Non-goals: PDF generation, emails, the store check-up, outbound, refunds, subscriptions, user accounts.

## Part 3 - Trace

A seller submits a subscription dispute: `reason: "subscription_canceled"`, `amountCents: 1900`, `orderRef: "ORD-2231"`, policy shown at checkout yes, charge `2026-10-12T14:03Z`, cancel request `2026-10-14T09:41Z`.

1. `POST /orders` stores a draft with token `rcp_8h2k...`, runs the checklist, preview decision DISPUTE by the subscription rule, writes `intake_received` and `preview_computed`.
2. `POST /orders/rcp_8h2k.../checkout` calls Whop with `account_id`, an inline plan of 29 dollars, `metadata: { orderId }`, `redirect_url: <web>/r/rcp_8h2k...`, idempotency key the order id. Order becomes `pending_payment`, `purchase_url` returned.
3. Seller pays with the sandbox card. Whop sends `payment.succeeded` with `data.id: pay_...` and `data.metadata.orderId`.
4. The webhook handler verifies the signature on the raw body, finds the order, runs the conditional update to `paid`, stores `whopPaymentId`, enqueues job `fulfill-<orderId>`, writes `payment_confirmed` and `job_queued`, returns 200.
5. The worker runs the checklist and v1 writer, fact checks, stores `result`, sets `fulfilled`, writes the last events.
6. `/r/rcp_8h2k...` polls `GET /orders/:token`, sees `fulfilled`, shows the reply.

## Runbook (execute in order)

1. Shared zod schemas: intake (one section per reason, keys taken from the F5a proof types so the checklist can run on it), preview, order response, events.
2. Migration: `Order` and `AgentEvent`. Add `WHOP_ACCOUNT_ID`, `WHOP_WEBHOOK_SECRET` and `DISPUTE_PACK_PRICE_CENTS` to the config class. Append the key names with empty values to `.env`, do not print it. Tell me which to fill.
3. `POST /orders`, `GET /orders/:token`, order state machine, card-digit guard, preview rate limit by IP in Redis (20 per hour), AgentEvent writes. Test with curl against the real backend.
4. HUMAN: in the Whop sandbox dashboard, open Developer, Webhooks, Create webhook. URL `https://carat-scotch-limes.ngrok-free.dev/webhooks/whop`, event `payment.succeeded`, API version v1. Copy the signing secret into `apps/api/.env` as `WHOP_WEBHOOK_SECRET` in my editor, and set `WHOP_ACCOUNT_ID=biz_ltZ3mTO5991YH2`. Restart the api. Start the worker in its own tab: `pnpm --filter @receipts/api worker`.
5. `POST /orders/:token/checkout` and `POST /webhooks/whop` (raw body parser on that route only, before the json parser), BullMQ queue and the worker job reusing the F5a checklist and v1 writer. Test the webhook with Whop's dashboard test-event button and with one sandbox purchase through the real checkout url.
6. Web: landing page at `/` (hero, one product, how the decision works, honest limits, no statistics or testimonials), intake form at `/start`, preview and buy screen, results page at `/r/[token]` with a status poll, copy button and a print stylesheet. Set the tab title to Receipts.
7. `/trail` page that lists the latest AgentEvents from `GET /events`.
8. Commit and push so Vercel deploys. Print the order token and the sandbox purchase URL for my run-through.
9. HUMAN: I buy one order in the sandbox with the test card and check the results page. Do not buy anything on the live site.

## Done list

1. `pnpm turbo run typecheck` and the api tests pass.
2. `curl -X POST .../orders` with the d07-style intake returns 201, a token and a DISPUTE preview. The same call with an ACCEPT-style intake returns a preview with no checkout available.
3. `POST /orders/:token/checkout` returns a `purchaseUrl` and the order is `pending_payment`.
4. A sandbox purchase with the 4242 card ends with the order `fulfilled` and the reply visible at `/r/<token>`.
5. `select count(*) from "Order" where "whopPaymentId" is not null` equals the number of sandbox purchases, and the Whop test-event button run twice does not create a second fulfillment.
6. `AgentEvent` rows exist for every step in the trace, and `/trail` shows them.
7. The landing page loads on the Vercel URL and the intake round trip works against the ngrok api.
