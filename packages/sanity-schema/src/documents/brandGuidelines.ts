import {BulbOutlineIcon} from '@sanity/icons/BulbOutline'
import {defineArrayMember, defineField, defineType} from 'sanity'

const stringList = (name: string, title: string, description?: string) =>
  defineField({
    name,
    title,
    description,
    type: 'array',
    of: [defineArrayMember({type: 'string'})],
    options: {layout: 'tags'},
    validation: (rule) => rule.unique(),
  })

/** One per client. Written as plain data so it can later serve as AI context. */
export const brandGuidelines = defineType({
  name: 'brandGuidelines',
  title: 'Brand guidelines',
  type: 'document',
  icon: BulbOutlineIcon,
  fields: [
    defineField({
      name: 'client',
      type: 'reference',
      to: [{type: 'client'}],
      validation: (rule) =>
        rule.required().custom(async (value, context) => {
          if (!value?._ref) return true
          const id = context.document?._id.replace(/^drafts\./, '')
          const count = await context
            .getClient({apiVersion: '2026-09-01'})
            .fetch<number>(
              'count(*[_type == "brandGuidelines" && client._ref == $ref && !(_id in [$id, "drafts." + $id])])',
              {ref: value._ref, id},
            )
          return count === 0 || 'This client already has brand guidelines.'
        }),
    }),
    defineField({name: 'brandVoice', title: 'Brand voice', type: 'text', rows: 4}),
    defineField({name: 'targetAudience', title: 'Target audience', type: 'text', rows: 3}),
    stringList('contentPillars', 'Content pillars'),
    stringList('wordsToUse', 'Words to use'),
    stringList('wordsToAvoid', 'Words to avoid'),
    stringList('ctaPreferences', 'CTA preferences', 'Preferred calls to action, e.g. “Book a table”.'),
    stringList('languages', 'Languages', 'BCP 47 codes, e.g. en-GB, fr-FR.'),
    defineField({
      name: 'notes',
      title: 'Notes',
      description: 'Anything else reviewers and AI drafts should respect (legal lines, spelling, emoji use).',
      type: 'text',
      rows: 4,
    }),
  ],
  preview: {
    select: {client: 'client.name'},
    prepare: ({client}) => ({title: client ? `${client} brand guidelines` : 'Brand guidelines'}),
  },
})
