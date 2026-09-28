import {verifyInternalRequest} from '@/server/hmac'
import {handleApi, json} from '@/server/http'
import {refreshExpiringTokens} from '@/server/publishing/refreshTokens'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/** Daily token maintenance, called by the scheduler Function (HMAC-signed). */
export async function POST(request: Request): Promise<Response> {
  return handleApi(request, {cors: false}, async () => {
    await verifyInternalRequest(request)
    return json(await refreshExpiringTokens())
  })
}
