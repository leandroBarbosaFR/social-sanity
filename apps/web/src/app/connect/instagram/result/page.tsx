import {CONNECT_RESULT_MESSAGES, isConnectResultReason} from '@/server/oauth'

export const dynamic = 'force-dynamic'

const USERNAME_PATTERN = /^[A-Za-z0-9._]{1,30}$/
const mainStyle = {maxWidth: 480, margin: '0 auto', padding: '80px 24px', textAlign: 'center'} as const

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

/** Shown in the OAuth popup after the callback. Renders only fixed messages and a validated username. */
export default async function InstagramConnectResultPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const status = first(params['status'])
  const username = first(params['username'])
  const reason = first(params['reason'])

  if (status === 'connected' && username && USERNAME_PATTERN.test(username)) {
    return (
      <main style={mainStyle}>
        <h1 style={{fontSize: 18, fontWeight: 600, color: '#7ee2a8'}}>Instagram connected as @{username}.</h1>
        <p>You can close this window.</p>
      </main>
    )
  }

  const message = isConnectResultReason(reason) ? CONNECT_RESULT_MESSAGES[reason] : 'The Instagram connection did not complete.'
  return (
    <main style={mainStyle}>
      <h1 style={{fontSize: 18, fontWeight: 600, color: '#f28b82'}}>Instagram was not connected</h1>
      <p>{message}</p>
      <p style={{color: '#9aa0a6', fontSize: 14}}>You can close this window and try again from the app.</p>
    </main>
  )
}
