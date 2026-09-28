import {HomeIcon} from '@sanity/icons/Home'
import {defineField, defineType} from 'sanity'

export const organization = defineType({
  name: 'organization',
  title: 'Organization',
  type: 'document',
  icon: HomeIcon,
  fields: [
    defineField({name: 'name', type: 'string', validation: (rule) => rule.required().max(120)}),
    defineField({name: 'logo', type: 'image'}),
    defineField({
      name: 'website',
      type: 'url',
      validation: (rule) => rule.uri({scheme: ['https', 'http']}),
    }),
    defineField({
      name: 'timezone',
      type: 'string',
      description: 'IANA time zone used for calendars and scheduling, e.g. Europe/London.',
      initialValue: 'UTC',
      validation: (rule) => rule.required(),
    }),
  ],
})
