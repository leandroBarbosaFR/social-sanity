import {describe, expect, test} from 'vitest'

import {normalizeHashtag, validatePostForPublishing, type PostForValidation, type ResolvedMediaItem} from './post'
import {
  canTransition,
  editorialStage,
  publishEligibility,
  publishingPhase,
  USER_TRANSITIONS,
  WORKFLOW_STATUSES,
  type WorkflowStatus,
} from './workflow'

const image: ResolvedMediaItem = {_key: 'i', kind: 'image', url: 'https://cdn.sanity.io/a.jpg', alt: null}
const video: ResolvedMediaItem = {_key: 'v', kind: 'video', url: 'https://cdn.sanity.io/a.mp4', alt: null}

const valid = (overrides: Partial<PostForValidation> = {}): PostForValidation => ({
  title: 'Launch',
  clientId: 'client-1',
  platforms: ['instagram'],
  format: 'image',
  caption: 'Hello',
  hashtags: ['coffee'],
  media: [image],
  scheduledAt: null,
  ...overrides,
})

describe('publishEligibility: approval is mandatory', () => {
  test.each<WorkflowStatus>(['approved', 'scheduled', 'failed'])('%s may be published', (status) => {
    expect(publishEligibility(status)).toEqual({allowed: true})
  })

  test.each<WorkflowStatus>(['idea', 'draft', 'internalReview', 'clientReview'])('%s is refused as not approved', (status) => {
    expect(publishEligibility(status)).toMatchObject({allowed: false, reason: 'not_approved'})
  })

  test('a running publish is reported, never started twice', () => {
    expect(publishEligibility('publishing')).toMatchObject({allowed: false, reason: 'in_progress'})
  })

  test('a published post is never published again', () => {
    expect(publishEligibility('published')).toMatchObject({allowed: false, reason: 'already_published'})
  })

  test('unknown or missing status is refused', () => {
    expect(publishEligibility(undefined).allowed).toBe(false)
    expect(publishEligibility('whatever').allowed).toBe(false)
  })
})

describe('status split', () => {
  test('publishing statuses are editorially approved', () => {
    for (const status of ['scheduled', 'publishing', 'published', 'failed'] as const) {
      expect(editorialStage(status)).toBe('approved')
    }
  })

  test('review statuses have no publishing phase', () => {
    for (const status of ['idea', 'draft', 'internalReview', 'clientReview', 'approved'] as const) {
      expect(publishingPhase(status)).toBe('unscheduled')
    }
  })

  test('every status maps to exactly one editorial stage and one publishing phase', () => {
    for (const status of WORKFLOW_STATUSES) {
      expect(editorialStage(status)).toBeTypeOf('string')
      expect(publishingPhase(status)).toBeTypeOf('string')
    }
  })
})

describe('user transitions', () => {
  test('people can never set publishing, published or failed by hand', () => {
    for (const from of WORKFLOW_STATUSES) {
      for (const to of ['publishing', 'published'] as const) expect(canTransition(from, to)).toBe(false)
    }
    expect(Object.values(USER_TRANSITIONS).flat()).not.toContain('publishing')
  })

  test('scheduling is only reachable from approved (or a failed run)', () => {
    const into = WORKFLOW_STATUSES.filter((from) => canTransition(from, 'scheduled'))
    expect(into.sort()).toEqual(['approved', 'failed'])
  })
})

describe('validatePostForPublishing', () => {
  test('a complete image post passes', () => {
    expect(validatePostForPublishing(valid())).toEqual([])
  })

  test('client and caption are required', () => {
    const fields = validatePostForPublishing(valid({clientId: null, caption: ''})).map((issue) => issue.field)
    expect(fields).toEqual(expect.arrayContaining(['client', 'caption']))
  })

  test.each([
    ['image', [video], 'An image post needs exactly one image.'],
    ['image', [image, image], 'An image post needs exactly one image.'],
    ['reel', [image], 'A Reel needs exactly one video.'],
    ['carousel', [image], 'A carousel needs at least 2 items.'],
    ['carousel', Array.from({length: 11}, () => image), 'A carousel can have at most 10 items.'],
    ['story', [], 'A Story needs exactly one image or video.'],
  ] as const)('%s with the wrong media is rejected', (format, media, message) => {
    const issues = validatePostForPublishing(valid({format, media: [...media]}))
    expect(issues).toContainEqual({field: 'media', message})
  })

  test('media without an uploaded file is rejected', () => {
    const issues = validatePostForPublishing(valid({media: [{...image, url: null}]}))
    expect(issues).toContainEqual({field: 'media', message: 'A media item has no uploaded file.'})
  })

  test('stories need no caption', () => {
    expect(validatePostForPublishing(valid({format: 'story', caption: '', media: [video]}))).toEqual([])
  })

  test('caption plus hashtags must fit 2,200 characters', () => {
    const issues = validatePostForPublishing(valid({caption: 'x'.repeat(2195), hashtags: ['toolong']}))
    expect(issues.map((issue) => issue.field)).toContain('caption')
  })

  test('at most 30 hashtags', () => {
    const issues = validatePostForPublishing(valid({hashtags: Array.from({length: 31}, (_, i) => `tag${i}`)}))
    expect(issues.map((issue) => issue.field)).toContain('hashtags')
  })

  test('scheduling requires a future time', () => {
    const now = new Date('2026-09-28T10:00:00Z')
    expect(validatePostForPublishing(valid(), {requireSchedule: true, now}).map((i) => i.field)).toContain('scheduledAt')
    expect(
      validatePostForPublishing(valid({scheduledAt: '2026-09-28T09:00:00Z'}), {requireSchedule: true, now}).map((i) => i.field),
    ).toContain('scheduledAt')
    expect(validatePostForPublishing(valid({scheduledAt: '2026-09-29T09:00:00Z'}), {requireSchedule: true, now})).toEqual([])
  })
})

describe('normalizeHashtag', () => {
  test('strips # and whitespace, keeps letters, digits and underscores', () => {
    expect(normalizeHashtag('  #CoffeeTime ')).toBe('CoffeeTime')
    expect(normalizeHashtag('café_2026')).toBe('café_2026')
  })

  test('rejects spaces and punctuation', () => {
    expect(normalizeHashtag('two words')).toBeNull()
    expect(normalizeHashtag('#')).toBeNull()
    expect(normalizeHashtag('hi!')).toBeNull()
  })
})
