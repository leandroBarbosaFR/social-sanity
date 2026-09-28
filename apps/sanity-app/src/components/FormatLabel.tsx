import {ImageIcon} from '@sanity/icons/Image'
import {ImagesIcon} from '@sanity/icons/Images'
import {MobileDeviceIcon} from '@sanity/icons/MobileDevice'
import {PlayIcon} from '@sanity/icons/Play'
import {Flex, Text} from '@sanity/ui'
import {POST_FORMAT_LABELS, type PostFormat} from '@social-studio/shared'
import type {ComponentType} from 'react'

export const FORMAT_ICONS: Record<PostFormat, ComponentType> = {
  image: ImageIcon,
  carousel: ImagesIcon,
  reel: PlayIcon,
  story: MobileDeviceIcon,
}

export function FormatLabel({format}: {format: PostFormat | null | undefined}) {
  if (!format) {
    return (
      <Text size={1} muted>
        —
      </Text>
    )
  }
  const Icon = FORMAT_ICONS[format]
  return (
    <Flex align="center" gap={2}>
      <Text size={1} muted>
        <Icon />
      </Text>
      <Text size={1} muted>
        {POST_FORMAT_LABELS[format]}
      </Text>
    </Flex>
  )
}
