# F0 - Scaffolding

Timebox: 30 min. Done when `/health` returns 200 on the public URL and one Terac call works. No feature schema here, that starts with F1.

Instructions for Claude Code (read first):

- Start from scratch, no skeleton copying. Scaffold with generator commands (pnpm init, prisma init, tsc --init, create-next-app), then edit the generated files directly. Use latest stable versions and write the resolved versions into this file's Part 2 when done.
- Check current docs before writing any integration code. If docs disagree with this file, docs win - tell me.
- If something is ambiguous or you see two valid approaches, stop and ask with 2-3 options and a pick. Do not guess.
- Never read, print or commit `.env` files. Secrets live in `.env` and the config class only.
- Code style: all lowercase comments in plain english, no decorative dividers, typed zod config class per app, template-literal logging, small focused functions.
- Stop at every step marked HUMAN and tell me exactly what to do.
- If any step runs 50% over its box, stop and tell me what to cut.

## Part 1 - Planning

What it does: an empty but wired monorepo. Express api, a BullMQ worker entry point, a Next.js web app, Postgres and Redis in Docker, and one `GET /health` that proves db, redis and the Whop key all work. A web page reads `/health`. Terac is reachable from Claude Code. Nothing in this feature depends on earlier work.

Core patterns: long-running tasks applies (the worker entry point exists now so F2-F5 only add jobs). Realtime, contention, scaling reads, scaling writes, large blobs, multi-step processes and proximity do not apply, there is no data flow yet.

Entities: none. Prisma is initialized with zero models. A health check row is not an entity.

Access patterns and indexes: n/a.

Object design: plain functions plus one `Config` class per app, parsed from env with zod at startup.

Concurrency: n/a, `/health` is read-only.

Decision log:

| decision | forced by | rejected |
|---|---|---|
| Railway (api, worker, Postgres, Redis) plus Vercel (web) | Whop webhooks need a stable public HTTPS url, worker must outlive my laptop | cloudflared tunnel as primary: right eventually for local debugging, wrong now because the url changes and webhooks need re-registering |
| Health checks run in parallel with a per-check timeout | one hung dependency must not hang the endpoint | sequential checks: wrong at any scale |
| Whop base url is config, default sandbox | docs show separate sandbox and production hosts | hardcoded prod url: wrong at any scale |
| Terac launches from Claude via MCP, worker uses REST with a Bearer key | MCP is OAuth-only, REST takes an API key | OAuth token plumbing in the worker: right eventually, wrong now |

Open questions for me:

- Does the Terac REST API key also work as a Bearer header on `https://terac.com/api/mcp`? If yes, the worker can use `@modelcontextprotocol/sdk` with a static header. Test in step 9.
- Organizers (Slack): does launching studies from Claude through the MCP count, or must the product call it?

## Part 2 - Spec

Version targets (fill in after install): node 24 LTS, pnpm, turbo, typescript, express 5, prisma 7 with `@prisma/adapter-pg`, ioredis, bullmq, `@whop/sdk`, next, postgres 18, redis 8.

Resolved versions (2026-10-24):

| package | version |
|---|---|
| node | 24.20.0 |
| pnpm | 11.28.8 |
| turbo | 2.11.10 |
| typescript | 7.0.2 (root, shared, api); 5.9.3 in web (pinned by create-next-app) |
| express | 5.3.0 |
| prisma, @prisma/client, @prisma/adapter-pg | 7.10.1 (npm `latest` for `prisma` is 8.0.0-rc.27, a release candidate, so pinned to 7.10.1 to match the client) |
| pg | 8.23.1 |
| ioredis | 6.0.0 |
| bullmq | 6.4.0 |
| @whop/sdk | 2.6.0 |
| @anthropic-ai/sdk | 1.2.0 |
| exa-js | 2.26.0 |
| @solarisdk/browser | 0.1.6 |
| @modelcontextprotocol/sdk | 1.32.1 |
| zod | 4.6.7 |
| tsx | 4.23.15 |
| next | 16.4.3 (react 19.3.0, tailwindcss 4.3.3) |
| @reduxjs/toolkit, react-redux | 2.13.0, 9.3.0 |
| postgres image | 18 (18.4) |
| redis image | 8 (8.10.0) |

Whop version date chosen: `2026-10-15-1`. The docs changelog lists dates up to `2026-10-24`, but the newest entry that touches accounts (the resource `accounts.me` belongs to) is `2026-10-15-1` (`stablecoin_rails` removed from accounts), and it is also the default baked into `@whop/sdk` 2.6.0. The three dates quoted below are all older than that.

Whop API: production `https://api.whop.com/api/v1`, sandbox `https://sandbox-api.whop.com/api/v1`, version date sent in `Api-Version-Date`. Docs pages show different dates (2026-06-20, 2026-07-01, 2026-08-13). Config value `WHOP_API_VERSION_DATE`, pin it to the newest date the docs list for the endpoints in use and report which one you chose.

Terac REST: base `https://terac.com/api/external/v2`, header `Authorization: Bearer <key>`. Terac MCP: `https://terac.com/api/mcp`, streamable HTTP, OAuth on first connect.

API contract, zod schemas in `packages/shared`:

```ts
// health response, shared by api and web
const checkSchema = z.object({ ok: z.boolean(), error: z.string().optional(), ms: z.number() });
export const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  checks: z.object({ db: checkSchema, redis: checkSchema, whop: checkSchema }),
});
```

`GET /health`: 200 if all three checks ok, 503 otherwise, same body shape, each check named. Per-check timeout 3000 ms.

Config keys (api): `PORT`, `DATABASE_URL`, `REDIS_URL`, `WHOP_API_KEY`, `WHOP_BASE_URL`, `WHOP_API_VERSION_DATE`, `TERAC_API_KEY`, `EXA_API_KEY`, `SOLARI_API_KEY`, `ANTHROPIC_API_KEY`. Web: `NEXT_PUBLIC_API_URL`. Missing or empty key fails startup with the key name.

Schema: none. Prisma initialized, no models, no migration.

Edge cases:

- Redis down: `/health` returns 503 with `redis.ok=false`, db and whop checks still report.
- Postgres down: same shape, `db.ok=false`.
- Whop 5xx or timeout: `whop.ok=false` with the error message, never the key.
- Missing env key: process exits at startup naming the key.
- Web cannot reach api: page shows "api unreachable", not a blank page.

Non-goals: models, auth, webhooks, queues with real jobs, the Whop sdk beyond one read call, any UI beyond the health page.

## Part 3 - Trace

Request: `GET https://api.<domain>/health`

Hops: browser or curl, Express, `Promise.all` of three checks, response.

```json
{
  "status": "ok",
  "checks": {
    "db": { "ok": true, "ms": 6 },
    "redis": { "ok": true, "ms": 2 },
    "whop": { "ok": true, "ms": 241 }
  }
}
```

Failure path, redis container stopped: db check runs `SELECT 1` and passes, redis `ping` rejects, whop passes. The body is the same shape with `status: "degraded"` and `checks.redis = { "ok": false, "error": "connect ECONNREFUSED 127.0.0.1:6379", "ms": 3 }`, HTTP 503. The web page renders redis red and the other two green.

## Runbook (execute in order)

1. Root: `mkdir receipts && cd receipts && git init`, `pnpm init`, `pnpm-workspace.yaml` with `apps/*` and `packages/*`, `pnpm add -D -w turbo typescript`, `.gitignore` covering `node_modules .env *.env.local .next dist .turbo`. Edit the generated `package.json` (name, private, `dev`, `build`, `typecheck` scripts calling turbo). Write `turbo.json` with `build`, `dev` (persistent, no cache) and `typecheck`.
2. `packages/shared`: `pnpm init`, `pnpm add zod`, `tsc --init`, name `@receipts/shared`, main and types pointing at `src/index.ts`, export the schemas above.
3. `apps/api`: `pnpm init`, `tsc --init`, add runtime deps `express zod ioredis bullmq @prisma/client @prisma/adapter-pg pg @whop/sdk @anthropic-ai/sdk exa-js @solarisdk/browser @modelcontextprotocol/sdk @receipts/shared@workspace:*` and dev deps `prisma tsx @types/express @types/node @types/pg`. Scripts: `dev` is `tsx watch src/index.ts`, `worker` is `tsx watch src/worker.ts`, `typecheck` is `tsc --noEmit`, plus `start` and `start:worker` for deploy. Add a minimal `src/worker.ts` that connects to Redis, logs that it is up, and exits cleanly on SIGTERM.
4. `apps/web`: `pnpm create next-app@latest apps/web --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --yes`, then add `@receipts/shared@workspace:*`, `@reduxjs/toolkit`, `react-redux`. Do not wire Redux yet.
5. `docker-compose.yml` at the root: postgres 18 on 5432 with a named volume and healthcheck, redis 8 on 6379 with healthcheck. Run `docker compose up -d` and confirm both healthy.
6. Prisma: `cd apps/api && pnpm exec prisma init --datasource-provider postgresql`, then follow what the generated config expects for Prisma 7 and the pg adapter. No models.
7. Config and health: `src/config.ts` (zod, parsed once, exported singleton), `src/health.ts` (three check functions with a 3s timeout each), `src/index.ts` (Express 5, `GET /health`). For the Whop check, read the `@whop/sdk` types and use the cheapest authenticated read call (expected `accounts.me`, confirm it exists). Use `WHOP_BASE_URL` and the version date header. Create `apps/api/.env` from `.env.example` and tell me which keys to fill. HUMAN: fill the keys.
8. Web: one page at `/` that fetches `${NEXT_PUBLIC_API_URL}/health`, parses with `healthResponseSchema`, shows each check green or red, and shows "api unreachable" on fetch failure.
9. Terac: HUMAN: run `claude mcp add --transport http terac https://terac.com/api/mcp`, then `/mcp` to authenticate. Then call `terac_get_context` and report the result. Separately run `curl -s -H "Authorization: Bearer $TERAC_API_KEY" https://terac.com/api/external/v2/opportunities | head -c 300` and report the status code. Also try the same Bearer key against the MCP url and report whether it is accepted (open question 1).
10. Deploy. HUMAN: create the Railway project from the GitHub repo with Postgres and Redis plugins, two services (api runs `start`, worker runs `start:worker`), copy env vars, use Railway's `DATABASE_URL` and `REDIS_URL`. Create the Vercel project with root `apps/web` and `NEXT_PUBLIC_API_URL` set to the Railway api domain. Claude Code may use the railway and vercel CLIs if they are installed and logged in, otherwise give me the exact dashboard steps.

## Done list

1. `docker compose ps` shows postgres and redis healthy.
2. `curl -i localhost:4000/health` returns 200 and a body with `db`, `redis`, `whop` all `ok: true`.
3. `docker compose stop redis`, then `curl -i localhost:4000/health` returns 503 with `redis.ok=false` and the other two true. Restart redis after.
4. Remove `WHOP_API_KEY` from `.env`, start the api, confirm it exits naming the key. Restore it.
5. The web page at localhost shows three green checks, and shows "api unreachable" with the api stopped.
6. `curl -i https://<api-domain>/health` returns 200 on the public url.
7. One Terac read-only call works (`terac_get_context` or the REST list call).
8. `pnpm turbo run typecheck` passes.
9. Worker service on Railway logs that it is up.
