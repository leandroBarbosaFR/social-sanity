export const PLATFORMS = ['instagram'] as const
export type Platform = (typeof PLATFORMS)[number]

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'Instagram',
}

export const POST_FORMATS = ['image', 'carousel', 'reel', 'story'] as const
export type PostFormat = (typeof POST_FORMATS)[number]

export const POST_FORMAT_LABELS: Record<PostFormat, string> = {
  image: 'Image',
  carousel: 'Carousel',
  reel: 'Reel',
  story: 'Story',
}

/** Limits from the Instagram content publishing API. */
export const INSTAGRAM_LIMITS = {
  captionMaxLength: 2200,
  hashtagsMax: 30,
  carouselMinItems: 2,
  carouselMaxItems: 10,
  publishesPer24h: 100,
} as const
