import type {IntegrationStatusResponse} from '@social-studio/shared'
import {preflight} from '@/server/cors'
import {getIntegrationStatus} from '@/server/env'
import {handleApi, json} from '@/server/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function OPTIONS(request: Request): Response {
  return preflight(request)
}

/** Which integrations are configured. Booleans only; never values. */
export async function GET(request: Request): Promise<Response> {
  return handleApi(request, {cors: true}, async () => {
    const body: IntegrationStatusResponse = getIntegrationStatus()
    return json(body)
  })
}
