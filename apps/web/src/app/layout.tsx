import type {Metadata} from 'next'
import type {ReactNode} from 'react'

export const metadata: Metadata = {
  title: 'Social Studio API',
  robots: {index: false, follow: false},
}

const bodyStyle = {
  margin: 0,
  minHeight: '100vh',
  background: '#111214',
  color: '#e6e6e6',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  lineHeight: 1.5,
} as const

export default function RootLayout({children}: {children: ReactNode}) {
  return (
    <html lang="en">
      <body style={bodyStyle}>{children}</body>
    </html>
  )
}
