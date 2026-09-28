import {UsersIcon} from '@sanity/icons/Users'
import {defineField, defineType} from 'sanity'

export const client = defineType({
  name: 'client',
  title: 'Client',
  type: 'document',
  icon: UsersIcon,
  groups: [
    {name: 'general', title: 'General', default: true},
    {name: 'social', title: 'Social accounts'},
  ],
  fields: [
    defineField({
      name: 'name',
      type: 'string',
      group: 'general',
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      group: 'general',
      options: {source: 'name', maxLength: 64},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'organization',
      type: 'reference',
      to: [{type: 'organization'}],
      group: 'general',
    }),
    defineField({name: 'logo', type: 'image', group: 'general'}),
    defineField({
      name: 'website',
      type: 'url',
      group: 'general',
      validation: (rule) => rule.uri({scheme: ['https', 'http']}),
    }),
    defineField({name: 'industry', type: 'string', group: 'general'}),
    defineField({
      name: 'description',
      title: 'Brand description',
      type: 'text',
      rows: 4,
      group: 'general',
      validation: (rule) => rule.max(2000),
    }),
    defineField({
      name: 'primaryLanguage',
      title: 'Primary language',
      description: 'BCP 47 code used when drafting captions, e.g. en-GB or fr-FR.',
      type: 'string',
      group: 'general',
      initialValue: 'en-GB',
      validation: (rule) => rule.regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, {name: 'BCP 47 language tag'}),
    }),
    defineField({
      name: 'status',
      type: 'string',
      group: 'general',
      options: {list: ['active', 'paused', 'archived'], layout: 'radio'},
      initialValue: 'active',
    }),
    defineField({
      name: 'instagram',
      title: 'Instagram',
      type: 'instagramConnection',
      group: 'social',
    }),
  ],
  preview: {select: {title: 'name', subtitle: 'industry', media: 'logo'}},
})
