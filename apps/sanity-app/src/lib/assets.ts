import type {ResolvedMediaItem} from '@social-studio/shared'

import {appConfig} from '../config'

/**
 * Builds Sanity CDN URLs from asset reference IDs, the same scheme `@sanity/image-url` uses:
 *   image-<hash>-<w>x<h>-<ext>  →  /images/<project>/<dataset>/<hash>-<w>x<h>.<ext>
 *   file-<hash>-<ext>           →  /files/<project>/<dataset>/<hash>.<ext>
 */
export function assetUrl(ref: string | undefined): string | null {
  if (!ref) return null
  const base = `https://cdn.sanity.io`
  const scope = `${appConfig.projectId}/${appConfig.dataset}`
  const image = /^image-([a-f0-9]+)-(\d+x\d+)-(\w+)$/.exec(ref)
  if (image) return `${base}/images/${scope}/${image[1]}-${image[2]}.${image[3]}`
  const file = /^file-([a-f0-9]+)-(\w+)$/.exec(ref)
  if (file) return `${base}/files/${scope}/${file[1]}.${file[2]}`
  return null
}

export interface MediaValue {
  _key: string
  _type: 'socialImage' | 'socialVideo'
  alt?: string
  asset?: {_ref?: string}
}

export function resolveMedia(items: readonly MediaValue[] | undefined): ResolvedMediaItem[] {
  return (items ?? []).map((item) => ({
    _key: item._key,
    kind: item._type === 'socialVideo' ? 'video' : 'image',
    url: assetUrl(item.asset?._ref),
    alt: item.alt ?? null,
  }))
}
