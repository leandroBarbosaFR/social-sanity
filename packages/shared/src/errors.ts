export const PUBLISHING_ERROR_CODES = [
  'token_expired',
  'permission_revoked',
  'account_not_connected',
  'invalid_media',
  'upload_failed',
  'meta_api_error',
  'rate_limited',
  'timeout',
  'validation_failed',
  'not_configured',
  'unknown',
] as const

export type PublishingErrorCode = (typeof PUBLISHING_ERROR_CODES)[number]

export interface PublishingErrorInfo {
  label: string
  /** What the person should do about it. */
  hint: string
  /** Whether retrying without changing anything can succeed. */
  retryable: boolean
}

export const PUBLISHING_ERRORS: Record<PublishingErrorCode, PublishingErrorInfo> = {
  token_expired: {
    label: 'Access token expired',
    hint: 'Reconnect the Instagram account from the client’s Social accounts tab, then retry.',
    retryable: false,
  },
  permission_revoked: {
    label: 'Permission revoked',
    hint: 'The account owner removed access or a required permission. Reconnect Instagram, then retry.',
    retryable: false,
  },
  account_not_connected: {
    label: 'No Instagram account connected',
    hint: 'Connect an Instagram professional account for this client before publishing.',
    retryable: false,
  },
  invalid_media: {
    label: 'Media rejected',
    hint: 'Instagram rejected the media (format, size, aspect ratio or duration). Replace it and retry.',
    retryable: false,
  },
  upload_failed: {
    label: 'Media upload failed',
    hint: 'Instagram could not fetch or process the media. Retrying usually resolves this.',
    retryable: true,
  },
  meta_api_error: {
    label: 'Instagram API error',
    hint: 'Meta returned an error. Check the details below; transient errors can be retried.',
    retryable: true,
  },
  rate_limited: {
    label: 'Rate limit reached',
    hint: 'Instagram allows 100 API posts per account per 24 hours. Retry later.',
    retryable: true,
  },
  timeout: {
    label: 'Timed out',
    hint: 'Instagram did not finish processing in time. Retrying resumes the same upload.',
    retryable: true,
  },
  validation_failed: {
    label: 'Content incomplete',
    hint: 'Required content or media is missing for this format. Fix the issues listed and retry.',
    retryable: false,
  },
  not_configured: {
    label: 'Publishing not configured',
    hint: 'Instagram API credentials or backend settings are missing on the server.',
    retryable: false,
  },
  unknown: {
    label: 'Unknown failure',
    hint: 'An unexpected error occurred. Check the details and retry.',
    retryable: true,
  },
}

export function isPublishingErrorCode(value: unknown): value is PublishingErrorCode {
  return typeof value === 'string' && (PUBLISHING_ERROR_CODES as readonly string[]).includes(value)
}
