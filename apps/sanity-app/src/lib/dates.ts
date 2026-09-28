const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})
const dateFormat = new Intl.DateTimeFormat(undefined, {day: 'numeric', month: 'short', year: 'numeric'})
const timeFormat = new Intl.DateTimeFormat(undefined, {hour: '2-digit', minute: '2-digit'})
const weekdayFormat = new Intl.DateTimeFormat(undefined, {weekday: 'short'})
const monthFormat = new Intl.DateTimeFormat(undefined, {month: 'long', year: 'numeric'})
const relativeFormat = new Intl.RelativeTimeFormat(undefined, {numeric: 'auto'})

export const formatDateTime = (iso: string) => dateTimeFormat.format(new Date(iso))
export const formatDate = (iso: string) => dateFormat.format(new Date(iso))
export const formatTime = (iso: string) => timeFormat.format(new Date(iso))
export const formatWeekday = (date: Date) => weekdayFormat.format(date)
export const formatMonth = (date: Date) => monthFormat.format(date)

export function formatRelative(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 60) return relativeFormat.format(seconds, 'second')
  if (abs < 3600) return relativeFormat.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return relativeFormat.format(Math.round(seconds / 3600), 'hour')
  if (abs < 86400 * 30) return relativeFormat.format(Math.round(seconds / 86400), 'day')
  return formatDate(iso)
}

export function startOfDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

/** Weeks start on Monday. */
export function startOfWeek(date: Date): Date {
  const day = startOfDay(date)
  const offset = (day.getDay() + 6) % 7
  return addDays(day, -offset)
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** `YYYY-MM-DD` in local time, used as a stable day key. */
export function dayKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseDayKey(key: string | undefined): Date | null {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1)
}

/** Value for `<input type="datetime-local">` in the browser's time zone. */
export function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${dayKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromLocalInputValue(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** Moves `iso` to another day while keeping its local time of day. */
export function moveToDay(iso: string, day: Date): string {
  const source = new Date(iso)
  const next = new Date(day)
  next.setHours(source.getHours(), source.getMinutes(), 0, 0)
  return next.toISOString()
}
