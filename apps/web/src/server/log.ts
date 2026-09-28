import 'server-only'

type Level = 'info' | 'warn' | 'error'
type Fields = Record<string, unknown>

/** Keys whose values are never written to logs, whatever their content. */
const REDACTED_KEYS = /token|secret|authorization|password|cookie|code_verifier|^code$|key$/i

function serializeError(error: unknown): Fields {
  if (error instanceof Error) {
    const record: Fields = {name: error.name, message: error.message}
    for (const key of ['code', 'retryable', 'providerCode', 'httpStatus', 'statusCode'] as const) {
      const value: unknown = (error as unknown as Record<string, unknown>)[key]
      if (value !== undefined) record[key] = value
    }
    return record
  }
  return {message: String(error)}
}

function sanitize(fields: Fields): Fields {
  const out: Fields = {}
  for (const [key, value] of Object.entries(fields)) {
    if (REDACTED_KEYS.test(key)) {
      out[key] = '[redacted]'
    } else if (key === 'error') {
      out[key] = serializeError(value)
    } else {
      out[key] = value
    }
  }
  return out
}

function write(level: Level, event: string, fields: Fields = {}): void {
  const line = JSON.stringify({level, event, time: new Date().toISOString(), ...sanitize(fields)})
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.info(line)
}

/** Structured JSON logger. Never pass tokens; keys that look secret are redacted as a safety net. */
export const logger = {
  info: (event: string, fields?: Fields) => write('info', event, fields),
  warn: (event: string, fields?: Fields) => write('warn', event, fields),
  error: (event: string, fields?: Fields) => write('error', event, fields),
}
