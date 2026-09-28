import {PUBLISHING_ERROR_CODES} from '@social-studio/shared'
import {defineField, defineType} from 'sanity'

const errorCodeList = PUBLISHING_ERROR_CODES.map((code) => ({title: code, value: code}))

/** Written only by the publishing service. */
export const publishingError = defineType({
  name: 'publishingError',
  title: 'Publishing error',
  type: 'object',
  readOnly: true,
  fields: [
    defineField({name: 'code', type: 'string', options: {list: errorCodeList}}),
    defineField({name: 'message', type: 'text', rows: 3}),
    defineField({name: 'retryable', type: 'boolean'}),
    defineField({name: 'occurredAt', type: 'datetime'}),
    defineField({name: 'providerCode', title: 'Provider code', type: 'string'}),
  ],
})

/** The active publishing lock. Its presence with status `publishing` means a run owns the post. */
export const publishingState = defineType({
  name: 'publishingState',
  title: 'Publishing run',
  type: 'object',
  readOnly: true,
  fields: [
    defineField({name: 'lockId', title: 'Lock ID', type: 'string'}),
    defineField({name: 'startedAt', title: 'Started at', type: 'datetime'}),
    defineField({name: 'attempt', type: 'number'}),
    defineField({name: 'containerId', title: 'Instagram container ID', type: 'string'}),
    defineField({name: 'mode', type: 'string', options: {list: ['live', 'mock']}}),
  ],
})

export const publishingHistoryEntry = defineType({
  name: 'publishingHistoryEntry',
  title: 'Publishing attempt',
  type: 'object',
  readOnly: true,
  fields: [
    defineField({name: 'attempt', type: 'number'}),
    defineField({name: 'trigger', type: 'string', options: {list: ['schedule', 'manual']}}),
    defineField({name: 'startedAt', type: 'datetime'}),
    defineField({name: 'finishedAt', type: 'datetime'}),
    defineField({name: 'outcome', type: 'string', options: {list: ['published', 'failed']}}),
    defineField({name: 'errorCode', type: 'string', options: {list: errorCodeList}}),
    defineField({name: 'message', type: 'text', rows: 2}),
    defineField({name: 'mode', type: 'string', options: {list: ['live', 'mock']}}),
  ],
  preview: {
    select: {attempt: 'attempt', outcome: 'outcome', startedAt: 'startedAt'},
    prepare: ({attempt, outcome, startedAt}) => ({
      title: `Attempt ${attempt ?? '?'}: ${outcome ?? 'unknown'}`,
      subtitle: startedAt,
    }),
  },
})

/** Non-secret summary of a connected Instagram account. Tokens live in Supabase only. */
export const instagramConnection = defineType({
  name: 'instagramConnection',
  title: 'Instagram connection',
  type: 'object',
  readOnly: true,
  description: 'Managed by the Connect Instagram flow. Access tokens are stored encrypted outside Sanity.',
  fields: [
    defineField({name: 'socialAccountId', title: 'Social account record ID', type: 'string'}),
    defineField({name: 'providerAccountId', title: 'Instagram user ID', type: 'string'}),
    defineField({name: 'username', type: 'string'}),
    defineField({
      name: 'accountType',
      title: 'Account type',
      type: 'string',
      options: {list: ['BUSINESS', 'MEDIA_CREATOR']},
    }),
    defineField({
      name: 'status',
      type: 'string',
      options: {list: ['connected', 'expired', 'revoked']},
    }),
    defineField({name: 'connectedAt', title: 'Connected at', type: 'datetime'}),
    defineField({name: 'tokenExpiresAt', title: 'Token expires at', type: 'datetime'}),
    defineField({name: 'mode', type: 'string', options: {list: ['live', 'mock']}}),
  ],
})
