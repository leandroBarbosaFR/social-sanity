/** A Supabase/PostgREST failure. The message never contains token material. */
export class DatabaseError extends Error {
  readonly pgCode: string | undefined

  constructor(operation: string, cause: {message: string; code?: string}) {
    super(`Database ${operation} failed: ${cause.message}`)
    this.name = 'DatabaseError'
    this.pgCode = cause.code
  }
}
