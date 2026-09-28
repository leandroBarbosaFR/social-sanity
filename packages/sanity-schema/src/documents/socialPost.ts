import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {
  INSTAGRAM_LIMITS,
  normalizeHashtag,
  PLATFORM_LABELS,
  PLATFORMS,
  POST_FORMAT_LABELS,
  POST_FORMATS,
  WORKFLOW_STATUS_LABELS,
  WORKFLOW_STATUSES,
  type PostFormat,
} from '@social-studio/shared'
import {defineArrayMember, defineField, defineType} from 'sanity'

interface PostDocumentShape {
  format?: PostFormat
  workflowStatus?: string
}

export const socialPost = defineType({
  name: 'socialPost',
  title: 'Social post',
  type: 'document',
  icon: DocumentTextIcon,
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'schedule', title: 'Schedule'},
    {name: 'publishing', title: 'Publishing'},
    {name: 'workflow', title: 'Workflow'},
  ],
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      group: 'content',
      description: 'Internal name; not published.',
      validation: (rule) => rule.required().max(160),
    }),
    defineField({
      name: 'client',
      type: 'reference',
      to: [{type: 'client'}],
      group: 'content',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'campaign',
      type: 'reference',
      to: [{type: 'campaign'}],
      group: 'content',
      options: {
        filter: ({document}) => {
          const clientRef = (document as {client?: {_ref?: string}}).client?._ref
          return clientRef ? {filter: 'client._ref == $clientRef', params: {clientRef}} : {}
        },
      },
    }),
    defineField({
      name: 'platforms',
      type: 'array',
      group: 'content',
      of: [defineArrayMember({type: 'string'})],
      options: {list: PLATFORMS.map((value) => ({title: PLATFORM_LABELS[value], value}))},
      initialValue: ['instagram'],
      validation: (rule) => rule.required().min(1).unique(),
    }),
    defineField({
      name: 'format',
      type: 'string',
      group: 'content',
      options: {
        list: POST_FORMATS.map((value) => ({title: POST_FORMAT_LABELS[value], value})),
        layout: 'radio',
        direction: 'horizontal',
      },
      initialValue: 'image',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'caption',
      type: 'text',
      rows: 6,
      group: 'content',
      validation: (rule) => rule.max(INSTAGRAM_LIMITS.captionMaxLength),
    }),
    defineField({
      name: 'hashtags',
      type: 'array',
      group: 'content',
      description: 'Without the # sign.',
      of: [defineArrayMember({type: 'string'})],
      options: {layout: 'tags'},
      validation: (rule) =>
        rule
          .max(INSTAGRAM_LIMITS.hashtagsMax)
          .unique()
          .custom((tags) => {
            const invalid = (tags as string[] | undefined)?.find((tag) => normalizeHashtag(tag) !== tag)
            return invalid ? `“${invalid}” is not a valid hashtag (letters, numbers and _ only).` : true
          }),
    }),
    defineField({
      name: 'media',
      type: 'array',
      group: 'content',
      of: [defineArrayMember({type: 'socialImage'}), defineArrayMember({type: 'socialVideo'})],
      validation: (rule) =>
        rule.custom((media, context) => {
          const format = (context.document as PostDocumentShape | undefined)?.format
          const items = (media as {_type: string}[] | undefined) ?? []
          if (format === 'carousel' && items.length > INSTAGRAM_LIMITS.carouselMaxItems) {
            return `A carousel can have at most ${INSTAGRAM_LIMITS.carouselMaxItems} items.`
          }
          if ((format === 'image' || format === 'reel' || format === 'story') && items.length > 1) {
            return 'This format takes a single media item.'
          }
          if (format === 'reel' && items.some((item) => item._type !== 'socialVideo')) {
            return 'A Reel must be a video.'
          }
          if (format === 'image' && items.some((item) => item._type !== 'socialImage')) {
            return 'An image post must be an image.'
          }
          return true
        }),
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover image',
      type: 'image',
      group: 'content',
      description: 'Optional Reel cover.',
      hidden: ({document}) => (document as PostDocumentShape | undefined)?.format !== 'reel',
    }),
    defineField({
      name: 'workflowStatus',
      title: 'Workflow status',
      type: 'string',
      group: 'workflow',
      options: {list: WORKFLOW_STATUSES.map((value) => ({title: WORKFLOW_STATUS_LABELS[value], value}))},
      initialValue: 'idea',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'scheduledAt',
      title: 'Scheduled at',
      type: 'datetime',
      group: 'schedule',
      validation: (rule) =>
        rule.custom((value, context) => {
          const status = (context.document as PostDocumentShape | undefined)?.workflowStatus
          return status === 'scheduled' && !value ? 'A scheduled post needs a publish time.' : true
        }),
    }),
    defineField({name: 'publishedAt', title: 'Published at', type: 'datetime', group: 'publishing', readOnly: true}),
    defineField({
      name: 'instagramMediaId',
      title: 'Instagram media ID',
      type: 'string',
      group: 'publishing',
      readOnly: true,
    }),
    defineField({
      name: 'instagramPermalink',
      title: 'Instagram permalink',
      type: 'url',
      group: 'publishing',
      readOnly: true,
    }),
    defineField({name: 'publishingError', title: 'Publishing error', type: 'publishingError', group: 'publishing'}),
    defineField({
      name: 'publishingAttempts',
      title: 'Publishing attempts',
      type: 'number',
      group: 'publishing',
      readOnly: true,
    }),
    defineField({name: 'publishing', title: 'Current publishing run', type: 'publishingState', group: 'publishing'}),
    defineField({
      name: 'publishingHistory',
      title: 'Publishing history',
      type: 'array',
      group: 'publishing',
      readOnly: true,
      of: [defineArrayMember({type: 'publishingHistoryEntry'})],
    }),
    defineField({name: 'createdBy', title: 'Created by', type: 'userStamp', group: 'workflow', readOnly: true}),
    defineField({name: 'approvedBy', title: 'Approved by', type: 'userStamp', group: 'workflow', readOnly: true}),
    defineField({name: 'approvedAt', title: 'Approved at', type: 'datetime', group: 'workflow', readOnly: true}),
  ],
  orderings: [
    {title: 'Scheduled', name: 'scheduledAsc', by: [{field: 'scheduledAt', direction: 'asc'}]},
    {title: 'Recently updated', name: 'updatedDesc', by: [{field: '_updatedAt', direction: 'desc'}]},
  ],
  preview: {
    select: {title: 'title', client: 'client.name', format: 'format', status: 'workflowStatus', media: 'media.0'},
    prepare: ({title, client, format, status, media}) => ({
      title,
      subtitle: [client, format, status].filter(Boolean).join(' · '),
      media,
    }),
  },
})
