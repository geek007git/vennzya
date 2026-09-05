import { Prisma } from '@/generated/prisma/client'

/**
 * Server-side money arithmetic. Importing this pulls in the Prisma runtime, so
 * client components must use `@/lib/format` for display instead.
 */

export type Money = Prisma.Decimal
export type MoneyInput = string | number | Prisma.Decimal

/** decimal.js rounding mode 4 — half-up, which is what Indian invoicing expects. */
const ROUND_HALF_UP = 4

export function money(value: MoneyInput): Money {
  return new Prisma.Decimal(value)
}

export const ZERO = () => money(0)

export function round2(value: Money): Money {
  return value.toDecimalPlaces(2, ROUND_HALF_UP)
}

export function sum(values: Money[]): Money {
  return values.reduce<Money>((acc, v) => acc.plus(v), ZERO())
}

/** Razorpay works in the smallest currency unit. ₹499.50 → 49950 paise. */
export function toPaise(value: Money): number {
  return round2(value).times(100).toNumber()
}

export function fromPaise(paise: number): Money {
  return money(paise).dividedBy(100)
}

/** Crossing the boundary out of the money layer: Decimal → plain number. */
export function toNumber(value: MoneyInput): number {
  return typeof value === 'number' ? value : Number(value.toString())
}
