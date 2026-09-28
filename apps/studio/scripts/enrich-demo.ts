/**
 * Adds the structured demo context (client slug/language, brand guidelines, campaign messages) to a
 * dataset seeded before those fields existed. Idempotent and non-destructive: only fills fields that
 * are missing and creates brand guidelines only for clients without any.
 *
 *   pnpm --filter @social-studio/studio enrich-demo
 */
import {randomUUID} from 'node:crypto'

import {getCliClient} from 'sanity/cli'

import {BRAND_GUIDELINES, CAMPAIGN_CONTEXT, CLIENT_CONTEXT} from './demo-context'

const client = getCliClient({apiVersion: '2026-09-01'}).withConfig({perspective: 'raw'})

type Named = {_id: string; name?: string; title?: string; hasGuidelines?: boolean}

const clients = await client.fetch<Named[]>(
  `*[_type == "client" && !(_id in path("drafts.**"))]{_id, name, "hasGuidelines": count(*[_type == "brandGuidelines" && client._ref == ^._id]) > 0}`,
)
const campaigns = await client.fetch<Named[]>(`*[_type == "campaign" && !(_id in path("drafts.**"))]{_id, title}`)

const tx = client.transaction()
let changes = 0
for (const doc of clients) {
  const context = doc.name ? CLIENT_CONTEXT[doc.name] : undefined
  if (!context) continue
  tx.patch(doc._id, (patch) => patch.setIfMissing({slug: {_type: 'slug', current: context.slug}, primaryLanguage: context.primaryLanguage}))
  changes += 1
  const guidelines = doc.name ? BRAND_GUIDELINES[doc.name] : undefined
  if (guidelines && !doc.hasGuidelines) {
    tx.create({_id: randomUUID(), _type: 'brandGuidelines', client: {_type: 'reference', _ref: doc._id}, ...guidelines})
    changes += 1
  }
}
for (const doc of campaigns) {
  const context = doc.title ? CAMPAIGN_CONTEXT[doc.title] : undefined
  if (!context) continue
  tx.patch(doc._id, (patch) => patch.setIfMissing(context))
  changes += 1
}

// Brand guidelines that already exist only get the new `notes` field.
const existing = await client.fetch<{_id: string; clientName?: string}[]>(
  `*[_type == "brandGuidelines" && !(_id in path("drafts.**"))]{_id, "clientName": client->name}`,
)
for (const doc of existing) {
  const notes = doc.clientName ? BRAND_GUIDELINES[doc.clientName]?.notes : undefined
  if (typeof notes === 'string') {
    tx.patch(doc._id, (patch) => patch.setIfMissing({notes}))
    changes += 1
  }
}

await tx.commit()
console.log(`Enriched demo content (${changes} operations).`)
