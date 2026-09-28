/**
 * Structured demo context (fictional businesses). Shared by `seed.ts` (fresh datasets) and
 * `enrich-demo.ts` (adds these fields to an already seeded dataset without overwriting edits).
 * Keyed by client name / campaign title.
 */

export const CLIENT_CONTEXT: Record<string, {slug: string; primaryLanguage: string}> = {
  'Maison Bistro': {slug: 'maison-bistro', primaryLanguage: 'en-GB'},
  'Atelier Form': {slug: 'atelier-form', primaryLanguage: 'en-GB'},
  'Ridgeline Outdoor': {slug: 'ridgeline-outdoor', primaryLanguage: 'en-GB'},
}

export const BRAND_GUIDELINES: Record<string, Record<string, unknown>> = {
  'Maison Bistro': {
    brandVoice: 'Warm, unpretentious and precise about ingredients. Never salesy.',
    targetAudience: 'Local professionals aged 28–55 who eat out weekly.',
    contentPillars: ['Seasonal produce', 'Behind the pass', 'Suppliers', 'Wine pairings'],
    wordsToUse: ['seasonal', 'market', 'slow-cooked'],
    wordsToAvoid: ['cheap', 'deal', 'foodie'],
    ctaPreferences: ['Book a table', 'See the menu'],
    languages: ['en-GB', 'fr-FR'],
    notes: 'Name the supplier whenever a dish features their produce. No more than one emoji per caption.',
  },
  'Atelier Form': {
    brandVoice: 'Calm, exact and material-led. Let the photographs do the talking; short sentences.',
    targetAudience: 'Private clients and developers planning low-carbon homes; peers in architecture.',
    contentPillars: ['Finished projects', 'Material studies', 'Process', 'Low-carbon building'],
    wordsToUse: ['timber', 'craft', 'daylight', 'low-carbon'],
    wordsToAvoid: ['luxury', 'stunning', 'dream home'],
    ctaPreferences: ['See the project', 'Start a conversation'],
    languages: ['en-GB'],
    notes: 'Always credit the photographer and structural engineer on project posts. No emoji.',
  },
  'Ridgeline Outdoor': {
    brandVoice: 'Practical, friendly and a bit dry. Speaks like the person behind the repair bench.',
    targetAudience: 'Hikers and climbers in the region who value repair over replacement.',
    contentPillars: ['Kit that lasts', 'Repair bench', 'Local routes', 'Community'],
    wordsToUse: ['repair', 'tested', 'local'],
    wordsToAvoid: ['extreme', 'epic', 'must-have'],
    ctaPreferences: ['Book a repair', 'Visit the shop'],
    languages: ['en-GB'],
    notes: 'Mention free repair checks on winter kit where relevant.',
  },
}

export const CAMPAIGN_CONTEXT: Record<string, Record<string, unknown>> = {
  'Autumn menu': {
    description: 'Six weeks of posts around the new autumn menu, built on the supplier relationships.',
    targetAudience: 'Regulars and nearby office workers looking for a weekday dinner.',
    keyMessages: ['The menu follows what the market has this week', 'Weekday tables are easy to book', 'Every dish names its supplier'],
  },
  'Timber House launch': {
    description: 'Reveal of the completed Timber House: first look, details, then the story of the build.',
    objective: 'Announce the completed Timber House project.',
    targetAudience: 'Prospective clients planning a new build or major renovation.',
    keyMessages: ['A family home built almost entirely from timber', 'Low embodied carbon without compromise on light', 'Designed with the family over two years'],
  },
  'Winter gear': {
    description: 'Get people ready for winter walks: what to repair, what to replace, where to go.',
    objective: 'Bring customers into the shop for winter kit checks and repairs.',
    targetAudience: 'Regular hikers preparing for the winter season.',
    keyMessages: ['Repair before you replace', 'Free winter kit checks in store', 'Local winter routes worth knowing'],
  },
}
