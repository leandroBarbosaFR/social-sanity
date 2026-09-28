import {useAuthToken} from '@sanity/sdk-react'
import type {ApiErrorBody, ApiErrorCode} from '@social-studio/shared'
import {useCallback} from 'react'

import {appConfig} from '../config'

export type BackendErrorCode = ApiErrorCode | 'backend_not_configured' | 'network_error' | 'no_session'

export class BackendError extends Error {
  readonly code: BackendErrorCode
  readonly status: number | null

  constructor(code: BackendErrorCode, message: string, status: number | null = null) {
    super(message)
    this.name = 'BackendError'
    this.code = code
    this.status = status
  }
}

export const isBackendConfigured = Boolean(appConfig.webUrl)

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false
  const error = (value as {error: unknown}).error
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error
}

/**
 * Calls the Next.js backend (`apps/web`) as the signed-in Sanity user. The backend verifies the
 * token against the Sanity API and checks project membership; it never returns secrets.
 */
export function useBackend() {
  const token = useAuthToken()

  return useCallback(
    async <T>(path: string, init: {method?: 'GET' | 'POST'; body?: unknown} = {}): Promise<T> => {
      if (!appConfig.webUrl) {
        throw new BackendError(
          'backend_not_configured',
          'Backend URL not configured. Set SANITY_APP_WEB_URL to the apps/web URL.',
        )
      }
      if (!token) {
        throw new BackendError('no_session', 'No Sanity session token is available to authenticate this request.')
      }

      let response: Response
      try {
        response = await fetch(`${appConfig.webUrl}${path}`, {
          method: init.method ?? 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            ...(init.body === undefined ? {} : {'Content-Type': 'application/json'}),
          },
          body: init.body === undefined ? undefined : JSON.stringify(init.body),
        })
      } catch {
        // A browser reports a CORS rejection exactly like a network failure, so name the origin the
        // backend must allow: a deployed app runs on its own https://<appHost>.sanity.studio origin.
        throw new BackendError(
          'network_error',
          `Could not reach the backend at ${appConfig.webUrl}. If it is running, add this app's origin (${window.location.origin}) to ALLOWED_APP_ORIGINS on the backend.`,
        )
      }

      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        if (isApiErrorBody(payload)) {
          throw new BackendError(payload.error.code, payload.error.message, response.status)
        }
        throw new BackendError('internal_error', `The backend responded with HTTP ${response.status}.`, response.status)
      }
      return payload as T
    },
    [token],
  )
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}
