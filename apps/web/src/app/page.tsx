const mainStyle = {maxWidth: 560, margin: '0 auto', padding: '64px 24px'} as const
const codeStyle = {background: '#1d1f23', padding: '2px 6px', borderRadius: 4, fontSize: 13} as const

export default function HomePage() {
  return (
    <main style={mainStyle}>
      <h1 style={{fontSize: 20, fontWeight: 600}}>Social Studio API</h1>
      <p>
        This is the backend for the Social Studio Sanity app. It handles Instagram account connections and
        publishing. There is no user interface here.
      </p>
      <p>
        Integration status: <code style={codeStyle}>GET /api/health</code>
      </p>
    </main>
  )
}
