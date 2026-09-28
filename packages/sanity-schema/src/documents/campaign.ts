import {RocketIcon} from '@sanity/icons/Rocket'
import {defineArrayMember, defineField, defineType} from 'sanity'

export const CAMPAIGN_STATUSES = ['planned', 'active', 'completed', 'archived'] as const

export const campaign = defineType({
  name: 'campaign',
  title: 'Campaign',
  type: 'document',
  icon: RocketIcon,
  fields: [
    defineField({name: 'title', type: 'string', validation: (rule) => rule.required().max(120)}),
    defineField({
      name: 'client',
      type: 'reference',
      to: [{type: 'client'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'status',
      type: 'string',
      options: {list: [...CAMPAIGN_STATUSES], layout: 'radio'},
      initialValue: 'planned',
    }),
    defineField({name: 'startDate', title: 'Start date', type: 'date'}),
    defineField({
      name: 'endDate',
      title: 'End date',
      type: 'date',
      validation: (rule) =>
        rule.custom((endDate, context) => {
          const startDate = (context.document as {startDate?: string} | undefined)?.startDate
          return !endDate || !startDate || endDate >= startDate || 'End date must be after the start date.'
        }),
    }),
    defineField({name: 'description', type: 'text', rows: 3, validation: (rule) => rule.max(1000)}),
    defineField({name: 'objective', type: 'text', rows: 3}),
    defineField({
      name: 'targetAudience',
      title: 'Target audience',
      description: 'Who this campaign speaks to. Narrows the client’s general audience.',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'keyMessages',
      title: 'Key messages',
      description: 'What every post in the campaign should get across, in priority order.',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      validation: (rule) => rule.max(8),
    }),
  ],
  preview: {select: {title: 'title', subtitle: 'client.name'}},
})
