/** Array item key in the same shape Studio generates. */
export function randomKey(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}
