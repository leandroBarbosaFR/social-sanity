# Social Studio

An agency workspace for planning, approving, scheduling and publishing social content, built as a
[Sanity App SDK](https://www.sanity.io/docs/app-sdk) application. It runs inside the Sanity
Dashboard, uses Sanity UI and the Content Lake for all content and workflow state, and publishes to
Instagram through a small Next.js backend that is the only place secrets live.

Milestone 1 status: foundation complete (content model, app shell, dashboard, content list, post
editor with Instagram preview, calendar, clients, campaigns, media, settings, Instagram connection
flow, publishing and scheduling architecture). Review and approval run on
[Sanity Workflows](https://www.sanity.io/docs/workflows) (early access), and AI features (caption
drafts, an assistant panel) on [Sanity Content Agent](https://www.sanity.io/docs/content-agent).
Analytics and additional networks are placeholders.

<!-- toc -->

- [Architecture](#architecture)
- [Monorepo structure](#monorepo-structure)
- [Versions](#versions)
- [Local setup](#local-setup)
- [Sanity setup](#sanity-setup)
- [Environment variables](#environment-variables)
- [Workflow](#workflow)
- [Content Agent](#content-agent)
- [Supabase setup](#supabase-setup)
- [Meta developer setup](#meta-developer-setup)
- [OAuth architecture](#oauth-architecture)
- [Publishing architecture](#publishing-architecture)
- [Failure handling](#failure-handling)
- [Security decisions](#security-decisions)
- [Known limitations](#known-limitations)
- [Deployment](#deployment)

<!-- tocstop -->

## Architecture

```
 Sanity Dashboard
 └─ apps/sanity-app  (App SDK + Sanity UI)          reads/writes content live via the SDK
        │  Bearer <Sanity user token>
        ▼
 apps/web  (Next.js 16, Vercel)                      verifies the token + project membership
        ├─ /api/auth/instagram/*   OAuth with Meta    ──► Supabase: encrypted tokens
        ├─ /api/posts/:id/publish  "Publish now"      ──► Instagram Graph API
        └─ /api/internal/*         HMAC-signed        ◄── Sanity Functions (schedule-posts,
                                                          publish-instagram)
 Sanity Content Lake: organizations, clients, brand guidelines, campaigns, posts, media,
                      workflow state, scheduling metadata, publishing history
```

**Sanity is the workspace.** Everything a person edits or reviews lives in the Content Lake:
clients, brand guidelines, campaigns, posts, media, approval state, schedules and publishing
history. The app writes through SDK hooks (`useEditDocument`, document actions) so edits are
real-time and collaborative, with Studio’s draft → published model: edits create a draft, and
**Save** publishes it. Scheduling only ever reads the saved (published) version.

**Supabase holds only what must not be in Sanity:** OAuth connections and AES-256-GCM encrypted
access tokens, token expiry, scopes and provider account IDs. A client document carries a
non-secret summary (`instagram.username`, `status`, `socialAccountId`) that the backend writes after
OAuth, so the app shows connection state in real time without ever touching a token.

**Why an App SDK app and not a Studio plugin?** The product is a purpose-built workflow tool, not a
document editor, and the App SDK is Sanity’s recommended way to build that. An admin Studio
(`apps/studio`) is still included, because an SDK app cannot deploy a schema, and it is useful for raw
data administration.

**Why a Next.js backend?** OAuth client secrets, the Supabase service role and the token encryption key
must stay server-side. Keeping them in one place (Vercel) means Sanity Functions need only a shared
HMAC secret, never the Meta or Supabase credentials.

## Monorepo structure

```
social-studio/
  apps/
    sanity-app/        App SDK application (the product UI)
    studio/            Admin Studio: schema deploy, raw editing, seed script, Workflows tool
    web/               Next.js backend: OAuth, publishing API, internal endpoints
  packages/
    shared/            Status vocabulary, validation, error taxonomy, API contracts
    workflows/         Sanity Workflows definition (post review) + tests on the in-memory engine
    sanity-schema/     Content model (organization, client, brandGuidelines, campaign, socialPost)
    instagram/         Typed Instagram Graph API client + dev mock
    database/          Supabase schema, token encryption, repositories
  functions/
    schedule-posts/    Scheduled Sanity Function: claims due posts
    publish-instagram/ PubSub Sanity Function: hands a claimed post to the backend
    sync-workflow-status/ Document Function: mirrors review stages onto posts
  sanity.blueprint.ts  Blueprint for the functions and their robot token
  sanity.workflow.ts   Workflows deployment (definition, tag, reader model)
```

Workspace packages export TypeScript source; Vite (Sanity CLI) and Next.js (`transpilePackages`)
compile them. There is no `packages/ui`: only one app renders UI, and it uses Sanity UI directly.

## Versions

Checked against the npm registry on 2026-09-26 (stable releases only):

| Package | Version | Notes |
| --- | --- | --- |
| Node.js | ≥ 24.11 (24 LTS) | Sanity needs ≥ 22.12; Functions run on `nodejs24.x` |
| pnpm | 12.6.0 | see note below |
| sanity (CLI + Studio) | 6.16.0 | |
| @sanity/sdk, @sanity/sdk-react | 3.5.0 | |
| @sanity/ui | 4.2.6 | |
| @sanity/icons | 5.2.2 | per-icon subpath imports (`@sanity/icons/Calendar`) |
| @sanity/client | 8.7.0 | backend and functions |
| @sanity/functions | 1.8.0 | |
| @sanity/blueprints | 0.27.0 | |
| @sanity/workflow-* | 0.35.0 | engine, cli, blueprint, sdk, react, components, diagram, studio, studio-plugin, engine-test: one version, see note |
| content-agent | 1.3.1 | Content Agent provider for the AI SDK |
| ai, @ai-sdk/react | 6.0.292, 3.0.295 | 6.x on purpose, see note |
| vitest | 5.0.1 | workflow definition tests |
| react, react-dom | 19.3.0 | |
| next | 16.3.6 | App Router, Turbopack |
| @supabase/supabase-js | 2.117.2 | |
| styled-components | 6.5.3 | peer of Sanity UI |
| zod | 4.6.5 | backend input validation |
| typescript | 6.0.3 | see note below |
| eslint | 10.11.0 (packages), 9.39.5 (`apps/web`) | see note below |

- **TypeScript 6.0.3, not 7.0.** TS 7 (the native Go port) is `latest` on npm, but it does not ship
  the JavaScript compiler API that `typescript-eslint` (peer `<6.1`) and Next’s type-check step use.
  Revisit when those support 7.
- **ESLint 9 in `apps/web`.** `eslint-config-next` 16.3.6 depends on React/a11y/import plugins that
  do not yet declare ESLint 10 support, so the web app pins the latest ESLint 9.
- **pnpm.** Corepack 0.34 (bundled with Node 24.11) cannot bootstrap pnpm 12. Install it with
  `npm i -g pnpm@12.6.0`, or prefix commands with `npx pnpm@12.6.0`. `pnpm-workspace.yaml` denies the
  `unrs-resolver` install script (it ships prebuilt binaries).
- **Workflows is one lockstep version.** Every `@sanity/workflow-*` package is pinned to exactly
  0.35.0, and so is every other runtime that reads the workflow data. `sanity` 6.16 bundles
  `@sanity/workflow-cli`/`-engine` 0.32 for `sanity workflows …`, which cannot read model-10 documents,
  so `pnpm-workspace.yaml` overrides them to 0.35.0. It also forces `@sanity/mutate` 0.18.2 under
  `@sanity/sdk` 3 (0.18.1 can leave document reads pending), as the Workflows docs require. Upgrade all
  of them together, following [the upgrade guide](https://www.sanity.io/docs/workflows/upgrade).
- **AI SDK 6, not 7.** `content-agent` 1.3.1 implements the provider v3 interface (`@ai-sdk/provider`
  3.x) that `ai` 6 uses. `ai` 7 moved to provider v4. Move to 7 when `content-agent` does.
- **Sanity UI 4 API changes** used throughout: `Stack`/`Inline` take `gap` (not `space`), `Grid`
  takes `gridTemplateColumns` (not `columns`), and `Menu*`, `Tooltip` and `Toast` import from
  `@sanity/ui/menu`, `@sanity/ui/tooltip` and `@sanity/ui/toast`.

## Local setup

```bash
nvm use                      # Node 24
npm i -g pnpm@12.6.0
pnpm install
cp .env.example .env         # reference for all variables; each app reads its own .env
```

Each app reads its own `.env` (copy the relevant block from the root `.env.example`):

| App | File | Start |
| --- | --- | --- |
| Sanity app | `apps/sanity-app/.env` | `pnpm dev:app` (port 3333) |
| Admin Studio | `apps/studio/.env` | `pnpm dev:studio` (port 3334) |
| Backend | `apps/web/.env.local` | `pnpm dev:web` (port 3000) |

The Sanity app renders only inside the Sanity Dashboard. `pnpm dev:app` prints a Dashboard URL to
open; sign in with a Sanity account that belongs to the organization.

Quality gates, run from the root: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` (or
`pnpm check`).

## Sanity setup

1. Create a project and dataset (or reuse one): `npx sanity@latest init --bare`, or through
   [sanity.io/manage](https://www.sanity.io/manage). Note the project ID and your organization ID.
2. Set `SANITY_STUDIO_PROJECT_ID`/`SANITY_STUDIO_DATASET` in `apps/studio/.env`, and
   `SANITY_APP_ORGANIZATION_ID`, `SANITY_APP_PROJECT_ID`, `SANITY_APP_DATASET`, `SANITY_APP_WEB_URL` in
   `apps/sanity-app/.env`.
3. Deploy the schema so the Content Lake, MCP and agents know the model:
   `pnpm --filter @social-studio/studio schema:deploy`
4. Deploy the review workflow (reads `SANITY_PROJECT_ID`/`SANITY_DATASET` from the root `.env`):
   `pnpm workflows:check` (offline), then `pnpm workflows:deploy`. Re-run after changing
   `packages/workflows`; unchanged definitions are not redeployed, and running posts stay on the
   version they started with.
5. For Content Agent, deploy the admin Studio (`pnpm --filter @social-studio/studio deploy`) and open
   it once in a browser. That registers the `social-studio` workspace the agent resolves.
6. Optional demo content (refuses to run on a dataset that already has an organization):
   `pnpm --filter @social-studio/studio seed`
   Seeded “published” and “failed” posts are marked as mock runs, so they never pass as real
   Instagram posts.
7. CORS: for local development the app calls the Content Lake from `http://localhost:3333`; add it
   as a CORS origin with credentials (`npx sanity@latest cors add http://localhost:3333 --credentials`)
   if the CLI does not offer to on first `pnpm dev:app`. The backend talks to Sanity server-side with
   a token and needs no CORS entry.
8. Create a write token (Editor) for the backend: Manage → API → Tokens → `SANITY_API_TOKEN`.

### Content model

| Type | Purpose |
| --- | --- |
| `organization` | The agency: name, logo, time zone |
| `client` | Name, logo, website, industry, description, status, `instagram` connection summary (read-only) |
| `brandGuidelines` | One per client: voice, audience, pillars, words to use/avoid, CTAs, languages |
| `campaign` | Client, status, date range, objective |
| `socialPost` | Title, client, campaign, platforms, format, caption, hashtags, media, cover, workflow status, schedule, Instagram IDs, publishing error/attempts/run/history, created/approved by |

Validation mirrors Instagram’s limits (2,200-character caption including hashtags, 30 hashtags,
2–10 carousel items, one video for a Reel). The same rules live in `packages/shared` and run in the
app (to disable actions) and on the server (as the authoritative gate). No token or secret field
exists in the schema.

## Workflow

```
Idea → Draft → Internal review → Client review → Approved → Scheduled → Publishing → Published
                                                                     ↘ Failed → (Retry) → Publishing
```

**Review and approval run on Sanity Workflows** (definition `social-post-review` in
`packages/workflows`, deployed with `pnpm workflows:deploy`, tag `prod`). Each post has one workflow
instance, stored beside the content in the same dataset:

- Stages `idea`, `draft`, `internalReview`, `clientReview` and `approved` match the `workflowStatus`
  values. The editor renders the buttons from the live evaluation (`@sanity/workflow-sdk`), so what
  is enabled is what the engine allows: Start draft, Submit for review, Send to client review,
  Approve, Request changes (with a reason, shown as “Changes requested”), Back to draft.
- The instance records who approved and when, the requested changes and the full history.
  "Back to draft" from `approved` is refused while the post is scheduled, publishing or published.
- A post without a workflow gets one when it is opened. The automatic `intake` stage places it in
  the stage that matches its current status, so existing and seeded posts join mid-way.
- `workflowStatus` on the post stays the field every list, filter and the scheduler read. After an
  action, the app writes the new status and saves the post (as before). The
  `sync-workflow-status` function does the same for changes made elsewhere (admin Studio, workflows
  CLI, MCP).
- The admin Studio has the Workflows plugin: a Workflows tool (board and overview of all runs) and a
  Workflows view on each post.

**Scheduling and publishing stay with the publishing service**, because they need its
revision-locked writes. `scheduled`, `publishing`, `published` and `failed` are set as before; the
workflow only reads them. When a publish succeeds, the backend ticks the post's workflow, which then
completes (`published` stage).

- **Schedule** is disabled until the content is complete for its format, the time is in the future,
  and the client has a connected Instagram account. The editor lists what is missing.
- **Publish now** works directly from Approved, Scheduled and Failed. From Draft or a review state it
  requires ticking an explicit “publish without approval” confirmation; the server enforces the same
  rule.
- Posts are read-only while publishing and after publishing.
- Failures show a typed reason (expired token, revoked permission, invalid media, upload failure,
  Meta API error, rate limit, timeout, unknown), the raw message, the Meta error code, attempt count
  and history, plus Retry.

Workflows is in early access and its checks are advisory: they decide which buttons are enabled, but
anyone with write access can still change a post directly. Dataset permissions are the real boundary.

## Content Agent

AI features use [Sanity Content Agent](https://www.sanity.io/docs/apis-and-sdks/content-agent-api)
through the backend. The backend forwards the signed-in user's own Sanity token (after verifying it),
so the agent sees and changes only what that person may, its edits are attributed to them, and no AI
secret exists anywhere. Every call uses the organization's AI credits.

- **Draft with AI** (post editor): `POST /api/posts/:id/caption` runs a read-only one-shot prompt. The
  agent reads the post, its campaign and the client's brand guidelines, and returns a caption plus
  hashtags. The editor shows the suggestion; “Use this” puts it in the form as an unsaved change.
- **Assistant** (sparkles button, top bar): `POST /api/ai/chat` streams one turn of a Content Agent
  thread (history is kept server-side per thread, scoped to the user). It can read the content model
  and write drafts of posts, but never posts that are scheduled, publishing or published. People
  review and save anything it drafts.

Requirements: `SANITY_ORGANIZATION_ID` on the backend, a deployed schema, and the admin Studio
deployed and opened once (see [Sanity setup](#sanity-setup)).

## Environment variables

`.env.example` lists every variable, grouped by where it is read. Summary:

| Variable | Read by | Secret |
| --- | --- | --- |
| `SANITY_APP_ORGANIZATION_ID`, `SANITY_APP_PROJECT_ID`, `SANITY_APP_DATASET`, `SANITY_APP_WEB_URL` | Sanity app (bundled) | no |
| `SANITY_STUDIO_PROJECT_ID`, `SANITY_STUDIO_DATASET` | Admin Studio | no |
| `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET` | backend | no |
| `SANITY_API_TOKEN` | backend (writes connection summaries and publish results) | **yes** |
| `SANITY_ORGANIZATION_ID` | backend (Content Agent); also blueprint deploy | no |
| `NEXT_PUBLIC_SUPABASE_URL` | backend | no |
| `SUPABASE_SERVICE_ROLE_KEY` | backend | **yes** |
| `META_APP_ID`, `META_REDIRECT_URI` | backend | no |
| `META_APP_SECRET` | backend | **yes** |
| `SOCIAL_TOKEN_ENCRYPTION_KEY` | backend (32 random bytes, base64) | **yes** |
| `INTERNAL_API_SECRET` | backend + both functions (≥ 32 chars) | **yes** |
| `ALLOWED_APP_ORIGINS` | backend CORS allowlist for the Sanity app | no |
| `APP_BASE_URL` | backend’s own public URL | no |
| `INSTAGRAM_API_MODE` | `live` (default) or `mock` (refused when `NODE_ENV=production`) | no |
| `SANITY_ORGANIZATION_ID`, `SANITY_PROJECT_ID`, `SANITY_DATASET` | blueprint deploy + functions | no |
| `WEB_BASE_URL` | functions (`functions env add`) | no |
| `OPENAI_API_KEY` | reserved; unused (AI runs on Content Agent) | **yes** |

The backend reads all variables at request time, so it builds without any of them. A missing
integration returns a typed 503 (`meta_not_configured`, `supabase_not_configured`, …) that the app
shows as a configuration state, for example “Instagram API credentials not configured.”

## Supabase setup

1. Create a project and apply `packages/database/supabase/migrations/20260926000000_init.sql`
   (`supabase db push`, or paste it into the SQL editor).
2. `social_accounts` and `oauth_states` have RLS enabled with **no policies**, and all privileges are
   revoked from `anon` and `authenticated`. Only the backend’s service-role client can read them, so
   `encrypted_access_token` is never reachable from a browser.
3. Put `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the backend only.
4. Optional cleanup of expired OAuth states (pg_cron):
   `select cron.schedule('delete-expired-oauth-states','17 * * * *',$$select public.delete_expired_oauth_states()$$);`
5. Generate the encryption key:
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
   Changing it makes stored tokens undecryptable, so every account must then reconnect.

## Meta developer setup

1. At developers.facebook.com create an app of type **Business**, add the **Instagram** product and
   choose **API setup with Instagram login** (not the deprecated Basic Display API).
2. Copy the Instagram app ID and secret into `META_APP_ID` / `META_APP_SECRET`.
3. Under Business login settings add the redirect URI
   `https://<backend>/api/auth/instagram/callback`. It must equal `META_REDIRECT_URI` exactly.
4. Scopes requested: `instagram_business_basic`, `instagram_business_content_publish`
   (Graph API v25.0, `graph.instagram.com`).
5. Only professional accounts (Business or Creator) can connect; personal accounts are rejected
   with a clear message.
6. While the app is in development mode, only Instagram testers who have accepted the invite can
   authorize. For everyone else, both permissions need Advanced Access through App Review.

Without credentials, set `INSTAGRAM_API_MODE=mock` in `apps/web/.env.local` (development only). The
mock client runs the full OAuth, lock and publish pipeline without calling Meta; every connection and
publish it produces is labelled **Mock** in the app and never looks like a real post.

## OAuth architecture

```
Sanity app ──POST /api/auth/instagram/start (Bearer)──► backend
   verifies user + project membership, checks the client exists,
   stores sha256(state) in oauth_states (10 min), returns a first-party authorizeUrl
popup ──GET /api/auth/instagram/authorize?state──► backend
   marks the state launched (once), sets HttpOnly SameSite=Lax cookie with a random
   browser binding (only its hash is stored), 302 → instagram.com/oauth/authorize
Instagram ──GET /api/auth/instagram/callback?code&state──► backend
   consumes the state atomically, compares the cookie binding in constant time (CSRF),
   code → short-lived → long-lived token (~60 days), GET /me, rejects non-professional,
   encrypts (AES-256-GCM) and upserts social_accounts, writes the non-secret summary to
   the Sanity client document, 302 → /connect/instagram/result
```

The result page shows only fixed messages keyed by a reason code, never free text from the URL.
Long-lived tokens are refreshed daily (inside `schedule-posts`, 03:00 UTC) and inline before a publish
when they are close to expiry. Expired or revoked tokens flip the client’s connection to
“Access expired/revoked” with a Reconnect button.

## Publishing architecture

**Claim (the lock).** A post is claimed by patching its *published* document with
`ifRevisionId(_rev)`. The patch sets `workflowStatus: publishing`, a `publishing` object
`{lockId, startedAt, attempt, mode, containerId?}` and increments `publishingAttempts`. A concurrent
claim gets a revision conflict and loses. The same system fields are mirrored onto the draft, so
saving an older draft later cannot revert them.

**Guarded writes.** Every result write re-checks `publishing.lockId`, commits with
`ifRevisionId`, and retries once on conflict.

**No double posting.** The Instagram container ID is saved to `publishing.containerId` *before*
`media_publish`. A retry after a retryable failure resumes that container. If Instagram reports it
`PUBLISHED`, nothing is published again and the post is marked published, with the note “media ID
could not be recovered”. `EXPIRED`/`ERROR` containers are recreated.

**Scheduling (Sanity Functions + Blueprints).**
- `schedule-posts` is a scheduled function (`*/5 * * * *`, UTC). It claims up to 25 posts where
  `workflowStatus == "scheduled" && scheduledAt <= now()` and calls `invoke('publish-instagram')`
  asynchronously for each. It also fails stale locks (`publishing` for more than 20 min → `failed`/`timeout`,
  retryable) and triggers the daily token refresh.
- `publish-instagram` is a PubSub function. It sends an HMAC-signed request to
  `/api/internal/publish`, which runs the publish with the secrets on the backend. PubSub delivery is
  at-least-once, so the backend swaps the claim lock for a deterministic run lock: only the first
  delivery runs, and duplicates get 409.
- **Publish now / Retry** in the app calls `POST /api/posts/:id/publish`, which claims and runs in
  the same request (`maxDuration` 300 s, video polling deadline 200 s).

```bash
export SANITY_ORGANIZATION_ID=… SANITY_PROJECT_ID=… SANITY_DATASET=production
npx sanity@latest blueprints init . --type ts --organization-id $SANITY_ORGANIZATION_ID  # once
npx sanity@latest blueprints plan
npx sanity@latest blueprints deploy
for fn in schedule-posts publish-instagram; do
  npx sanity@latest functions env add $fn WEB_BASE_URL https://<backend>
  npx sanity@latest functions env add $fn INTERNAL_API_SECRET <same value as the backend>
done
npx sanity@latest functions test schedule-posts     # local dry run: logs only (context.local)
npx sanity@latest functions logs publish-instagram
```

The blueprint defines the robot token `social-publisher` (project editor), both publishing
functions, and `sync-workflow-status` (a Document Function on `sanity.workflow.instance` stage
changes). Deploy the workflow definition with `pnpm workflows:deploy` first: Blueprints does not
manage workflow definitions yet.
Secrets are never written into `sanity.blueprint.ts`.

## Failure handling

Every run ends as `published` or `failed`. Nothing fails silently. A failure writes
`publishingError {code, message, retryable, occurredAt, providerCode}` and a `publishingHistory`
entry, and the dashboard lists it under Publishing failures.

| Condition | Code | Retryable |
| --- | --- | --- |
| Meta 190 (subcodes 463/460/467) | `token_expired` | no; reconnect |
| 190/458, code 10, codes 200–299 | `permission_revoked` | no; reconnect |
| codes 4/17/32/613, subcode 2207042 | `rate_limited` | yes |
| 9004, 2207052 (media fetch) | `upload_failed` | yes |
| 2207004/5/9/23/26/28/35/53, 36000–36004 | `invalid_media` | no; replace media |
| codes 1/2, HTTP 5xx, `is_transient` | `meta_api_error` | yes |
| client or processing timeout | `timeout` | yes (resumes the container) |
| missing credentials/config | `not_configured` | no |
| content incomplete | `validation_failed` | no |
| no connected account | `account_not_connected` | no |
| anything else | `unknown` | yes |

## Security decisions

- No Instagram passwords are ever requested; OAuth only.
- Provider tokens live only in Supabase, AES-256-GCM encrypted, with AAD
  `provider:providerAccountId` binding each ciphertext to its account. They are never sent to
  browsers, stored in Sanity or logged.
- Secrets exist only in the backend (`import 'server-only'`, never `NEXT_PUBLIC_`) and in function
  env vars (`INTERNAL_API_SECRET` only).
- Browser → backend calls carry the user’s Sanity token. The backend verifies it against
  `api.sanity.io` and checks project membership. CORS is an exact origin allowlist, with no credentials.
- OAuth: single-use hashed state with a 10-min expiry, plus an HttpOnly browser-binding cookie
  compared in constant time (CSRF / login CSRF).
- Function → backend calls use an HMAC-SHA256 signature over timestamp + raw body, with a 5-minute
  window and a constant-time compare.
- Response headers: `nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, CSP
  `frame-ancestors 'none'`, HSTS.
- Meta webhooks are not used in Milestone 1. If they are added, verify `X-Hub-Signature-256` with
  the app secret before processing.

## Known limitations

- **Not yet run end to end.** Everything typechecks, lints and builds, but the app has not been
  opened in the Sanity Dashboard, and no real Meta account has been connected. The token check
  (`/users/me` + `/projects/:id`) has not been exercised with an App SDK token. `useAuthToken()`
  can return null in some Dashboard auth modes; the app then shows a clear “no session token” error.
- **Sanity Workflows is early access (0.x).** Minor versions can break APIs; read the
  [release notes](https://www.sanity.io/docs/workflows/release-notes) before upgrading. The definition
  is tested on the in-memory engine (`pnpm test`) and was smoke-tested against the project's Content
  Lake. The editor UI, the Studio plugin and `sync-workflow-status` have not been run end to end.
- **Content Agent has not been called yet.** It needs the admin Studio deployed and opened once.
  Using the App SDK user token through the backend is how Studio authenticates, but it is unverified
  here.
- `defineScheduledFunction` is marked alpha in `@sanity/blueprints` 0.27.0, and cron cadence limits
  depend on your plan.
- If media is replaced between a retryable failure and its retry, the resumed container still holds
  the old media. Moving the post back to Draft clears this; a media fingerprint is a planned fix.
- Calendar drag-and-drop uses native HTML5 drag events: desktop only.

## Deployment

| Piece | Where | Command |
| --- | --- | --- |
| Sanity app | Sanity Dashboard | `pnpm --filter @social-studio/sanity-app deploy` (first time add `-- --create --title "Social Studio"`, then save the returned app ID as `deployment.appId` in `sanity.cli.ts`) |
| Schema | Content Lake | `pnpm --filter @social-studio/studio schema:deploy` |
| Review workflow | Content Lake | `pnpm workflows:deploy` |
| Admin Studio | Sanity hosting | `pnpm --filter @social-studio/studio deploy` (required for Content Agent; open it once) |
| Backend | Vercel | Import the repo, root directory `apps/web`, framework Next.js, install command `pnpm install`, env vars from `.env.example` |
| Database | Supabase | Apply `packages/database/supabase/migrations` |
| Functions | Sanity Blueprints | see [Publishing architecture](#publishing-architecture) |

Set `SANITY_APP_WEB_URL` to the Vercel URL before deploying the app, and add the app’s origin to
`ALLOWED_APP_ORIGINS` on the backend.
