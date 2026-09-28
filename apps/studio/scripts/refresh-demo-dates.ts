/**
 * Keeps a demo dataset presentable: posts that are not published yet but whose `scheduledAt` has
 * passed are moved forward by whole weeks (same weekday and time) until they are in the future.
 * Without this, seeded "scheduled" posts become due and the scheduler would try to publish them.
 *
 *   pnpm --filter @social-studio/studio refresh-demo-dates
 */
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2026-09-01'}).withConfig({perspective: 'raw'})
const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const now = Date.now()

const stale = await client.fetch<{_id: string; _rev: string; scheduledAt: string}[]>(
  `*[_type == "socialPost" && defined(scheduledAt) && scheduledAt < now() && !(workflowStatus in ["published", "publishing"])]{_id, _rev, scheduledAt}`,
)
const tx = client.transaction()
for (const post of stale) {
  const at = new Date(post.scheduledAt).getTime()
  const weeks = Math.floor((now - at) / WEEK_MS) + 1
  tx.patch(post._id, (patch) => patch.ifRevisionId(post._rev).set({scheduledAt: new Date(at + weeks * WEEK_MS).toISOString()}))
}
if (stale.length > 0) await tx.commit()
console.log(`Moved ${stale.length} past-due demo post(s) into the future.`)
