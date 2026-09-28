/** Workspace slugs: routing only, never authorization. Same rule as the organizations.slug check. */
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/

const RESERVED = new Set(['admin', 'api', 'app', 'auth', 'login', 'logout', 'signup', 'onboarding', 'settings', 'new', 'www'])

export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '')
}

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && !RESERVED.has(slug)
}
