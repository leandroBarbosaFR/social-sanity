import {parseIntegrationStatus, type IntegrationStatusResponse} from '@social-studio/shared'
import {useEffect, useState} from 'react'

import {errorMessage, isBackendConfigured, useBackend} from './backend'

export type IntegrationState =
  | {status: 'unconfigured'}
  | {status: 'loading'}
  | {status: 'ready'; data: IntegrationStatusResponse}
  | {status: 'error'; error: string}

/**
 * Whether the backend is reachable (any successful /api/health response) and which server-side
 * integrations it has configured. Booleans only; the backend never returns secrets.
 */
export function useIntegrationStatus(): IntegrationState {
  const request = useBackend()
  const [state, setState] = useState<IntegrationState>(isBackendConfigured ? {status: 'loading'} : {status: 'unconfigured'})

  useEffect(() => {
    if (!isBackendConfigured) return undefined
    let cancelled = false
    request<unknown>('/api/health')
      .then((body) => {
        if (cancelled) return
        const data = parseIntegrationStatus(body)
        setState(data ? {status: 'ready', data} : {status: 'error', error: 'The backend answered /api/health with an unexpected response.'})
      })
      .catch((error: unknown) => !cancelled && setState({status: 'error', error: errorMessage(error)}))
    return () => {
      cancelled = true
    }
  }, [request])

  return state
}
