import type {IntegrationStatusResponse} from '@social-studio/shared'
import {useEffect, useState} from 'react'

import {errorMessage, isBackendConfigured, useBackend} from './backend'

export type IntegrationState =
  | {status: 'unconfigured'}
  | {status: 'loading'}
  | {status: 'ready'; data: IntegrationStatusResponse}
  | {status: 'error'; error: string}

/** Which server-side integrations are configured. Booleans only; the backend never returns secrets. */
export function useIntegrationStatus(): IntegrationState {
  const request = useBackend()
  const [state, setState] = useState<IntegrationState>(isBackendConfigured ? {status: 'loading'} : {status: 'unconfigured'})

  useEffect(() => {
    if (!isBackendConfigured) return undefined
    let cancelled = false
    request<IntegrationStatusResponse>('/api/health')
      .then((data) => !cancelled && setState({status: 'ready', data}))
      .catch((error: unknown) => !cancelled && setState({status: 'error', error: errorMessage(error)}))
    return () => {
      cancelled = true
    }
  }, [request])

  return state
}
