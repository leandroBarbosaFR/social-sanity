/** `SANITY_APP_*` variables are inlined by the Sanity CLI at build time. */
declare const process: {
  readonly env: Readonly<Record<string, string | undefined>>
}

declare module '*.css'
