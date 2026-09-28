import 'server-only'
import {DatabaseConfigError, TokenDecryptionError} from '@social-studio/database'
import {InstagramApiError} from '@social-studio/instagram'
import {PUBLISHING_ERRORS, type PublishingErrorCode} from '@social-studio/shared'
import {ApiError} from '../errors'

export interface PublishFailureInfo {
  code: PublishingErrorCode
  message: string
  retryable: boolean
  providerCode?: string
}

/** A failure decided by the publish service itself (not thrown by a provider). */
export class PublishFailure extends Error {
  readonly info: PublishFailureInfo

  constructor(code: PublishingErrorCode, message: string, options: {retryable?: boolean; providerCode?: string} = {}) {
    super(message)
    this.name = 'PublishFailure'
    this.info = {
      code,
      message,
      retryable: options.retryable ?? PUBLISHING_ERRORS[code].retryable,
      ...(options.providerCode ? {providerCode: options.providerCode} : {}),
    }
  }
}

const CONFIG_API_CODES = new Set([
  'meta_not_configured',
  'supabase_not_configured',
  'sanity_not_configured',
  'encryption_not_configured',
])

/** Maps anything thrown during a run to the PublishingError stored on the post. */
export function toFailureInfo(error: unknown): PublishFailureInfo {
  if (error instanceof PublishFailure) return error.info
  if (error instanceof InstagramApiError) {
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      ...(error.providerCode ? {providerCode: error.providerCode} : {}),
    }
  }
  if (error instanceof DatabaseConfigError || (error instanceof ApiError && CONFIG_API_CODES.has(error.code))) {
    return {code: 'not_configured', message: error.message, retryable: false}
  }
  if (error instanceof TokenDecryptionError) {
    return {
      code: 'token_expired',
      message: 'The stored Instagram token could not be decrypted. Reconnect the Instagram account.',
      retryable: false,
    }
  }
  return {
    code: 'unknown',
    message: error instanceof Error ? error.message : 'Unexpected error while publishing.',
    retryable: true,
  }
}
