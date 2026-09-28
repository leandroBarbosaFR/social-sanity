/** Instagram glyph drawn with currentColor at 1em, matching @sanity/icons sizing. @sanity/icons has no brand icons. */
export function InstagramGlyph(props: {title?: string}) {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 25 25"
      fill="none"
      role={props.title ? 'img' : undefined}
      aria-hidden={props.title ? undefined : true}
      aria-label={props.title}
    >
      <rect x="5.5" y="5.5" width="14" height="14" rx="4" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="12.5" cy="12.5" r="3.2" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="16.4" cy="8.6" r="0.8" fill="currentColor" />
    </svg>
  )
}
