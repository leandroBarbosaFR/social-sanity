import 'server-only'
import type {InstagramConnectionSummary} from '@social-studio/shared'
import {z} from 'zod'
import {ApiError} from './errors'
import {draftId, getSanityClient} from './sanity'

const clientDocSchema = z.object({
  _id: z.string(),
  _rev: z.string(),
  name: z.string().nullish(),
  organizationId: z.string().nullish(),
  hasInstagram: z.boolean().nullish(),
})

const clientPairSchema = z.object({
  published: clientDocSchema.nullable(),
  draft: clientDocSchema.nullable(),
})

export type ClientDocs = z.infer<typeof clientPairSchema>

const CLIENT_PROJECTION = `{_id, _rev, name, "organizationId": organization._ref, "hasInstagram": defined(instagram)}`

/** Loads the published and draft versions of a client document. */
export async function getClientDocs(clientId: string): Promise<ClientDocs> {
  const result: unknown = await getSanityClient().fetch(
    `{
      "published": *[_type == "client" && _id == $id][0]${CLIENT_PROJECTION},
      "draft": *[_type == "client" && _id == $draftId][0]${CLIENT_PROJECTION}
    }`,
    {id: clientId, draftId: draftId(clientId)},
  )
  return clientPairSchema.parse(result)
}

export async function requireClient(clientId: string): Promise<ClientDocs & {organizationId: string}> {
  const docs = await getClientDocs(clientId)
  const doc = docs.published ?? docs.draft
  if (!doc) throw new ApiError(404, 'not_found', 'Client not found.')
  return {...docs, organizationId: doc.organizationId ?? 'default'}
}

function targetIds(docs: ClientDocs): string[] {
  return [docs.published?._id, docs.draft?._id].filter((id): id is string => Boolean(id))
}

/** Writes the non-secret connection summary to the published client and its draft (if any). */
export async function setInstagramSummary(clientId: string, summary: InstagramConnectionSummary): Promise<void> {
  const docs = await getClientDocs(clientId)
  const ids = targetIds(docs)
  if (ids.length === 0) throw new ApiError(404, 'not_found', 'Client not found.')
  const client = getSanityClient()
  const tx = client.transaction()
  for (const id of ids) tx.patch(client.patch(id).set({instagram: {_type: 'instagramConnection', ...summary}}))
  await tx.commit({visibility: 'sync'})
}

export async function unsetInstagram(clientId: string): Promise<void> {
  const docs = await getClientDocs(clientId)
  const ids = targetIds(docs)
  if (ids.length === 0) return
  const client = getSanityClient()
  const tx = client.transaction()
  for (const id of ids) tx.patch(client.patch(id).unset(['instagram']))
  await tx.commit({visibility: 'sync'})
}

/** Updates status/expiry on the mirrored summary; only touches documents that have one. */
export async function updateInstagramStatus(
  clientId: string,
  update: {status: InstagramConnectionSummary['status']; tokenExpiresAt?: string | null},
): Promise<void> {
  const docs = await getClientDocs(clientId)
  const ids = [docs.published, docs.draft].flatMap((doc) => (doc?.hasInstagram ? [doc._id] : []))
  if (ids.length === 0) return
  const client = getSanityClient()
  const tx = client.transaction()
  const fields: Record<string, unknown> = {'instagram.status': update.status}
  if (update.tokenExpiresAt !== undefined) fields['instagram.tokenExpiresAt'] = update.tokenExpiresAt
  for (const id of ids) tx.patch(client.patch(id).set(fields))
  await tx.commit()
}
