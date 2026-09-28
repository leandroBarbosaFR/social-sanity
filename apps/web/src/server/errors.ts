import 'server-only'
import type {ApiErrorCode} from '@social-studio/shared'

/** An error that maps directly onto an ApiErrorBody response. */
export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly extra: Record<string, unknown> | undefined

  constructor(status: number, code: ApiErrorCode, message: string, extra?: Record<string, unknown>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.extra = extra
  }
}
