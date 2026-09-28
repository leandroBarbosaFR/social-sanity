import type {NextConfig} from 'next'

const securityHeaders = [
  {key: 'X-Content-Type-Options', value: 'nosniff'},
  // OAuth callback URLs carry authorization codes; never leak them via Referer.
  {key: 'Referrer-Policy', value: 'no-referrer'},
  {key: 'X-Frame-Options', value: 'DENY'},
  {key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains'},
  {key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()'},
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'none'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ['@social-studio/shared', '@social-studio/instagram', '@social-studio/database', '@social-studio/workflows'],
  async headers() {
    return [{source: '/:path*', headers: securityHeaders}]
  },
}

export default nextConfig
