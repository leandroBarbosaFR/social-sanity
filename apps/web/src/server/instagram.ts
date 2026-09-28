import 'server-only'
import {LiveInstagramService, MockInstagramClient, type InstagramService} from '@social-studio/instagram'
import {getInstagramRuntime} from './env'
import {ApiError} from './errors'

/**
 * Returns the Instagram service for the configured mode, or throws 503 meta_not_configured.
 * Mock mode is only possible outside production (enforced in env.ts).
 */
export function getInstagramService(): InstagramService {
  const runtime = getInstagramRuntime()
  switch (runtime.mode) {
    case 'live':
      return new LiveInstagramService(runtime.config)
    case 'mock':
      return new MockInstagramClient({redirectUri: runtime.redirectUri})
    case 'unconfigured':
      throw new ApiError(503, 'meta_not_configured', runtime.message)
  }
}
