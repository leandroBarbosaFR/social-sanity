export const API_VERSION = '2026-09-01'

export const appConfig = {
  projectId: process.env.SANITY_APP_PROJECT_ID ?? '',
  dataset: process.env.SANITY_APP_DATASET ?? 'production',
  /** Base URL of the Next.js backend; empty when not configured. */
  webUrl: (process.env.SANITY_APP_WEB_URL ?? '').replace(/\/+$/, ''),
}

export const isProjectConfigured = Boolean(appConfig.projectId)
