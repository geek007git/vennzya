/**
 * Display formatting only — deliberately free of any Prisma import so client
 * components can use it without dragging the database runtime into the bundle.
 * Decimal arithmetic lives in `money.ts`, which is server-side.
 */

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

const inrWholeFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

function toNumber(value: string | number): number {
  return typeof value === 'number' ? value : Number(value)
}

export function formatInr(value: string | number): string {
  return inrFormatter.format(toNumber(value))
}

/** Drops the `.00` on whole rupee amounts — cleaner on product cards. */
export function formatInrCompact(value: string | number): string {
  const n = toNumber(value)
  return Number.isInteger(n) ? inrWholeFormatter.format(n) : inrFormatter.format(n)
}

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

export function formatDate(value: Date | string): string {
  return dateFormatter.format(typeof value === 'string' ? new Date(value) : value)
}

export function formatDateTime(value: Date | string): string {
  return dateTimeFormatter.format(typeof value === 'string' ? new Date(value) : value)
}
