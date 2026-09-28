import {defineField, defineType} from 'sanity'

/** A Sanity user at a point in time. Users are not documents, so we store their ID and name. */
export const userStamp = defineType({
  name: 'userStamp',
  title: 'User',
  type: 'object',
  fields: [
    defineField({name: 'sanityUserId', title: 'Sanity user ID', type: 'string'}),
    defineField({name: 'name', title: 'Name', type: 'string'}),
  ],
  preview: {select: {title: 'name', subtitle: 'sanityUserId'}},
})
