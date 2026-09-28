import {PlayIcon} from '@sanity/icons/Play'
import {ImageIcon} from '@sanity/icons/Image'
import {defineField, defineType} from 'sanity'

export const socialImage = defineType({
  name: 'socialImage',
  title: 'Image',
  type: 'image',
  icon: ImageIcon,
  options: {hotspot: true},
  fields: [
    defineField({
      name: 'alt',
      title: 'Alternative text',
      type: 'string',
      description: 'Sent to Instagram as alt text for accessibility.',
      validation: (rule) => rule.max(1000),
    }),
  ],
})

export const socialVideo = defineType({
  name: 'socialVideo',
  title: 'Video',
  type: 'file',
  icon: PlayIcon,
  options: {accept: 'video/mp4,video/quicktime'},
})
