# Social Studio: Sanity runs the whole life of a social post

*DEV + Sanity Challenge 2026, Path Two: "Vibe-Code Something Strange". Draft for the DEV article.*

## What I built

Social Studio is a social content operating system for agencies, built as a custom **Sanity App SDK**
application in the Sanity Dashboard. An agency manages clients, their brand guidelines and campaigns,
writes Instagram posts, takes each post through a review with **Sanity Workflows** (internal review,
then client review), and publishes approved posts to Instagram through Meta's API, either
immediately or on a schedule run by **Sanity Functions**. **Content Agent** drafts captions from the
client's structured brand and campaign context and powers an in-app assistant.

Sanity project ID: `8btwn23g`.

## Why

Social scheduling tools treat a post as a caption plus a timestamp. In an agency, the post is the
end of a chain: which client, which campaign and message, which brand rules, who wrote it, who
approved it (internally and at the client), and whether it actually went live. That chain is
structured content and a process, which is exactly what Sanity is good at. The app is the
"strange" part: Sanity is not the CMS behind a website here, it is the system that coordinates the
editorial process and then reaches out to an external platform.

## How Sanity is used

| Capability | Where |
| --- | --- |
| Structured content | client → brandGuidelines, campaign → client, socialPost → client + campaign; publishing state, history and errors on the post |
| App SDK | The whole product UI: dashboard, content list, month/week calendar with drag-to-reschedule, post editor with Instagram preview, client and campaign pages, real-time document editing |
| Sanity Workflows | The review process: definition `social-post-review` deployed to the project, one run per post, buttons rendered from the live evaluation, Workflows tool in the admin Studio |
| Sanity Functions | Scheduled publisher (`schedule-posts`), PubSub handoff (`publish-instagram`), and a document function that mirrors workflow stages onto posts (`sync-workflow-status`), defined in one Blueprint. Tested locally with `sanity functions test`; not deployed yet (they need the public backend URL) |
| Content Agent | Caption drafts and an assistant, running as the signed-in user |
| Hosting | App in the Dashboard; admin Studio at sanity-social-8btwn23g.sanity.studio |

## Architecture

```
Sanity Dashboard ── Social Studio (App SDK, Sanity UI)
      │   reads/writes content live            │ bearer: the user's Sanity token
      ▼                                        ▼
 Content Lake (8btwn23g/production)      Next.js backend (the only place secrets live)
  clients, brand, campaigns, posts        Meta OAuth, publishing, Content Agent proxy
  Workflows definitions + runs            Supabase: encrypted Instagram tokens
      ▲                                        │
 Sanity Functions: schedule → publish ─────────┘──► Instagram Graph API
```

## Structured content model

- **client**: name, slug, logo, website, industry, description, primary language, Instagram
  connection *summary* (username, status, expiry; never a token).
- **brandGuidelines** (one per client): voice, target audience, content pillars, words to use,
  words to avoid, CTA preferences, languages, notes. Each is its own field, so both reviewers and the
  AI can use them.
- **campaign**: client, status, dates, description, objective, target audience, key messages.
- **socialPost**: client, campaign, platform, format (image, carousel, Reel, Story), caption,
  hashtags, media (images/videos with alt text), cover, schedule, workflow status, and the publishing
  record: current run (lock, attempt, container ID), attempts, error (typed code, retryable,
  provider code), history, Instagram media ID, permalink, published time.

## Sanity Workflows

The review is a Workflows definition, not status buttons: Idea → Draft → Internal review → Client
review → Approved, with "Request changes" (with a reason) looping back to Draft and "Back to draft"
from Approved only while the post is not scheduled or publishing. The run records who approved and
when. An automatic `intake` stage lets existing posts join at the stage matching their status.

Publishing is deliberately *not* part of the workflow: it needs revision-locked writes against an
external API. The workflow reads the post's publishing state and completes itself when the post goes
live. Publishing is only possible after approval, enforced in the app, the API and the atomic claim.

## Instagram publishing

- Meta's current Instagram API with Instagram Login (no Basic Display, no passwords).
- OAuth state: random, stored hashed, single-use, expiring, bound to the browser with an HttpOnly
  cookie; replayed and cookie-less callbacks are rejected (verified).
- Tokens: AES-256-GCM encrypted in Supabase, bound to the account, never in Sanity, never in a
  browser or log.
- Publishing: container → wait for processing → `media_publish`. The container ID is saved before
  publishing, so a retry resumes it and never publishes twice; a transient error while checking an
  old container aborts rather than risking a duplicate (tested).
- Failures are typed (expired token, revoked permission, invalid media, upload failure, rate limit,
  timeout, Meta API error, unknown) and shown on the post with retry where safe.

## AI with Content Agent

"Draft with AI" asks Content Agent for a caption and hashtags for one post. The agent reads the post,
its campaign and the client's brand guidelines itself (read-only, drafts perspective). A real result
for a Reel about wine pairings used the brand's words to use, its calls to action and the campaign's
key message, and avoided the brand's forbidden words. The suggestion appears in a dialog; nothing
changes until a person clicks "Use this", and saved posts still go through review. The assistant can
read content and write drafts, but never touches scheduled or published posts.

## Interesting problems

- **Version lockstep.** `sanity` 6.16 bundles Workflows CLI/engine 0.32, which cannot read the
  model-10 documents that Workflows 0.35 writes. Found by checking the lockfile, fixed with pnpm
  overrides.
- **Content Agent in practice.** Two bugs only showed up against the live API: the one-shot
  `prompt()` in `content-agent` 1.3.1 cannot parse the streamed reply, and addressing the Studio by
  name made the agent ask "which studio?". Threads plus the resolved application key fixed both.
- **One status, two meanings.** `workflowStatus` drives the scheduler and locks, so it stays one
  field, but the UI shows it as a review stage plus a publishing phase.

## What went wrong / what changed

See [challenge-build-log.md](challenge-build-log.md). In short: npm could not install a pnpm
workspace; the Studio had no project; a multi-tenant SaaS direction was explored and parked after
finding that "one Sanity project per customer" needs a commercial conversation with Sanity; the
baseline allowed publishing without approval, which was removed.

## What I learned

(To be written by the author.)

## Run and test

See the [README](../README.md) (Local setup, Sanity setup, Meta setup) and
[judge-testing.md](judge-testing.md). `pnpm check` runs typecheck, lint, 72 tests and all builds.

## Screenshot checklist

1. Dashboard
2. Calendar (month)
3. Content list with Workflow and Publishing columns
4. Post editor with the Instagram preview
5. The review stepper and workflow actions (a post in client review)
6. Client page: brand guidelines and Instagram connection state
7. Publishing result (published post with "View on Instagram", or a failed post with its typed error)
8. Admin Studio Workflows tool (board of runs)

## Future work

Real Instagram connection and live publish for the demo, public backend and deployed Functions,
Brand Guardian (Path One: an agent that validates drafts against brand and campaign rules), more
networks, and the parked multi-tenant SaaS.
