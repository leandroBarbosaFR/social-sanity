# Testing guide for judges

Sanity project ID: **`8btwn23g`** (dataset `production`). All content is fictional demo data.

## What is deployed

| Surface | Where | Login |
| --- | --- | --- |
| Social Studio (the custom App SDK app) | Sanity Dashboard of the project's organization, app "Social Studio" | Sanity account that is a member of the organization |
| Admin Studio (schema, raw content, Workflows tool) | https://sanity-social-8btwn23g.sanity.studio | Sanity account that is a member of project `8btwn23g` |
| Publishing backend (Next.js) | Not publicly deployed yet (see below) | — |

Both Sanity surfaces require a Sanity login, because the App SDK app runs inside the Sanity
Dashboard. **Access for judges is granted by invitation**: send the Sanity account email you want to
use to the author through the challenge channel, and it will be invited to the organization/project
with the Editor role. No passwords or tokens are shared, and none are stored in this repository.

## Safest way to test (no credentials needed beyond the invitation)

1. Open the Sanity Dashboard and choose **Social Studio**.
2. **Dashboard**: needs approval, publishing failures, upcoming posts and recent activity.
3. **Content**: columns for Client, Campaign, Format, **Workflow** (review stage) and **Publishing**;
   filter by stage, client, campaign, format and date.
4. Open a post, e.g. *Supplier story: Hollow Farm* (Maison Bistro, in client review):
   - the stepper shows Review · Sanity Workflows and Publishing · Instagram;
   - the review buttons (Approve, Back to internal review, Request changes…) come from the live
     Sanity Workflows evaluation, not from hard-coded status buttons;
   - the Instagram preview on the right reflects the format (image, carousel, Reel, Story).
5. **Calendar**: month and week views; click a post to open it. Scheduled posts can be dragged to
   another day (never into the past).
6. **Clients → Maison Bistro → Brand**: structured brand guidelines (voice, audience, pillars, words
   to use/avoid, CTAs, languages, notes). **Campaigns → Autumn menu**: objective, audience, key messages.
7. **AI Assistant** (left navigation) opens the Content Agent panel (needs the backend, see below).
8. In the admin Studio, open the **Workflows** tool to see one review run per post, with history.

Please avoid publishing-related actions on demo posts; see below for why they need the backend.

## What needs the backend (and why it may not work in the deployed app)

"Draft with AI", the Assistant panel, Connect Instagram and Publish now call the Next.js backend,
which holds every secret (Meta app secret, encrypted Instagram tokens). Until it is deployed to a
public URL these features show a clear error in the deployed app ("Could not reach the backend…").
They were verified with the backend running locally:

- **Draft with AI** returned a caption using the client's brand vocabulary, CTAs and the campaign's
  key message (about 30 seconds; uses Content Agent AI credits).
- **Assistant** answered "which posts are in client review" correctly from the dataset.
- **Instagram connect / publish** in mock mode (no Meta credentials): OAuth state is single-use and
  browser-bound; the token is stored encrypted outside Sanity; a published post cannot be published
  again; an unapproved post is refused; a disconnected account fails visibly with a typed error.
  Mock results are labelled `mock` and never presented as real Instagram posts.

To run everything locally, follow **Local setup** in the [README](../README.md).

## How Instagram publishing can be observed

Real publishing requires a Meta app with Instagram API access and an Instagram professional account
connected to a client. When that is configured, an approved post shows **Publish now**; the post moves
to *Publishing*, then *Published* with `instagramMediaId`, `instagramPermalink` and `publishedAt`
written back to the Sanity document, and a **View on Instagram** link. If no real account is
connected at judging time, this has not been demonstrated live, and the submission says so.
