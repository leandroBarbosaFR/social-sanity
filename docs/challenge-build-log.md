# Build log — Sanity Challenge 2026 (Path Two)

Concise, honest notes from building this with Claude Code. No secrets are recorded here.

## Initial state (2026-09-26)

- A pnpm monorepo already existed: a Sanity App SDK app (`apps/sanity-app`), an admin Studio
  (`apps/studio`), a Next.js publishing backend (`apps/web`), Supabase token storage, a typed
  Instagram Graph API package and two Sanity Functions for scheduling. It had never been run.
- First problem: `npm i` failed with `Cannot read properties of null (reading 'matches')`. The repo
  is a pnpm workspace (`packageManager: pnpm@12.6.0`); npm cannot read it. Corepack 0.34 (bundled
  with Node 24.11) cannot bootstrap pnpm 12 either, and the global npm prefix is root-owned, so pnpm
  was installed under `~/.local` and linked into `/usr/local/bin`.
- Claude's mistake: an early `corepack enable` left a broken `pnpm` shim that crashed; it was
  replaced in the next step.
- The Studio crashed with `Configuration must contain projectId`: no `.env` files existed. A new
  Sanity project (`8btwn23g`, dataset `production`) was created through the Sanity MCP server, with
  CORS origins for the Studio (3334), app (3333) and backend (3000).

## Sanity Workflows (2026-09-26)

- The app had a hand-rolled state machine (`workflowStatus` + transition tables). It was moved onto
  Sanity Workflows 0.35.0 (early access) for the review part: Idea → Draft → Internal review →
  Client review → Approved. Scheduling and publishing deliberately stay with the backend because
  they need revision-locked writes against Instagram.
- Versions were checked against npm and the docs, not memory. Two real findings:
  - Every `@sanity/workflow-*` package must be on one version, but `sanity` 6.16 bundles
    `@sanity/workflow-cli`/`-engine` **0.32** as an oclif plugin, which cannot read model-10 workflow
    documents. Fixed with pnpm overrides to 0.35.0 (plus the documented `@sanity/mutate` 0.18.2 pin).
  - `content-agent` 1.3.1 implements AI SDK provider v3; `ai` 7 moved to v4, so `ai` is pinned to 6.x.
- Design choice that worked well: an automatic `intake` stage routes an instance to the stage that
  matches the post's current status, so existing (seeded) posts join the workflow mid-way.
- Workflow definition tested with the in-memory engine (20 tests), then deployed and smoke-tested
  against the real Content Lake (draft → review → approved → published completes the instance).
- Test failures that were Claude's fault, not the code's: an action param typed `text` (only
  `string` is allowed — caught by `sanity-workflows deploy --check`), and actor IDs in tests that were
  not account-global Sanity user IDs (`g…`).

## Content Agent (2026-09-26 → 09-28)

- "Draft with AI" and an Assistant panel run through the backend with the signed-in user's own
  Sanity token, so the agent can only do what that person can.
- It could not be exercised until a Studio was deployed. The admin Studio is now hosted at
  `https://sanity-social-8btwn23g.sanity.studio`; deploying it was enough to register the
  application (no browser visit needed).
- Two integration bugs found only by calling the live API (neither was visible in types or docs):
  1. `provider.prompt()` (one-shot, non-streaming) in `content-agent` 1.3.1 fails with
     `Unexpected token 'i', "id: 1 data"… is not valid JSON` — the API answers with SSE.
     Fix: use a throwaway thread (`provider.agent(threadId)`) through `generateText`, which parses SSE.
  2. Addressing the application by `{name, resource}` made the agent reply "Which studio should I
     count those in?". Fix: resolve the application key with `resolveApplication()` and pass `{key}`.
- Verified end to end through the real backend route: a Reel caption for "Wine pairing reel" used
  the brand's words to use (`market`, `slow-cooked`), its CTAs ("Book a table", "See the menu") and
  the campaign key message about weekday tables, and avoided the forbidden words. ~36 s per draft.

## Detour: a multi-tenant SaaS plan (2026-09-28), parked

- The next request was a full multi-tenant SaaS (Supabase Auth, one Sanity project per agency,
  RLS). Phase 0/1 foundations were built on branch `multi-tenant-saas`: a control-plane migration
  with RLS and 35 isolation tests against Postgres 17 in Docker (mutation-checked: disabling RLS on
  `clients` makes 9 fail).
- Research into Sanity plans found a likely blocker for "one project per customer": the plan terms
  restrict use to the subscriber's internal business purposes, and new projects are rate-limited to
  5 per hour per organization. That needs a conversation with Sanity, not code.
- For the challenge the direction changed back to the App SDK app as the product. The SaaS branch
  is kept, untouched.

## Challenge branch (`challenge/sanity-social`, from 2026-09-28)

- Baseline commit `0c2dc17` (tag `baseline-app-sdk`); secret scan of tracked files clean (one false
  positive was a `sha512` integrity hash in the lockfile).
- Audit result: most of the brief already existed (calendar with drag-to-reschedule, content list
  with filters, client pages, OAuth, idempotent publishing, scheduled Function). Work focused on gaps
  rather than rewrites.
- Content model: client `slug` + `primaryLanguage`, brand `notes`, campaign `description`,
  `targetAudience`, `keyMessages[]` — the fields the AI draft actually reads.
- `workflowStatus` stays one field (the scheduler, locks and filters read one value), but the UI now
  shows it as two things: the editorial stage and the publishing phase (content list columns and a
  stepper in the editor).
- Behaviour change: publishing now requires approval everywhere. The baseline allowed "publish
  without approval" with a checkbox; that contradicts the point of the workflow, so the path was
  removed from the app and the API (`publishEligibility`).
- Tests added: publishing rules and validation (30), Meta error mapping and publish-flow idempotency
  against a scripted Graph API (22). One expectation was wrong on Claude's side (`unknown` Meta errors
  are retryable by design; container resume makes a manual retry safe).

## Verification against the real project (2026-09-28)

- Backend run locally against project `8btwn23g`, with a local Supabase (Docker, via the Supabase CLI)
  as the token store and `INSTAGRAM_API_MODE=mock` (no Meta credentials yet). Throwaway documents were
  used and deleted afterwards.
- OAuth: start → authorize → callback connected a mock account; the Sanity client document got only
  the summary (`mode: mock`), Supabase got the AES-GCM token (`v1.` prefix). Replaying a launched state
  → `invalid_state`; a callback without the browser-binding cookie → `csrf`.
- Publishing: approved post → published (mock) with media ID, attempt count and history written to
  Sanity; second publish → `already_published`; draft post → refused ("Only approved posts can be
  published"); after disconnecting the account → `failed` with `account_not_connected`.
- Scheduler: `sanity functions test schedule-posts` (dry run) found the due posts. It also exposed
  that two seeded "scheduled" demo posts had dates in the past, which a deployed scheduler would try to
  publish; `refresh-demo-dates` now moves stale demo dates forward by whole weeks.
- Workflows: `start-review-workflows` started one run per demo post; the intake stage placed each at
  its current status (idea, draft, internal review, client review, approved, published).
- Deployments: App SDK app "Social Studio" in the organization Dashboard; admin Studio at
  sanity-social-8btwn23g.sanity.studio. Functions are not deployed (need the public backend URL and a
  Blueprints stack, an admin step).
- Mistakes on the way: a commit accidentally included the functions' local `.build/` output
  (checked for secrets, removed in a follow-up commit, now gitignored); an OAuth test script called
  the authorize URL twice and consumed its own state.
- Not verified: the UI has not been looked at in a browser by the agent (no browser available);
  a real Instagram publish has not happened (no Meta app/account connected yet).
