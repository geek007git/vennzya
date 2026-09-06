import type { CouponType } from '@/generated/prisma/enums'
import { type Money, money, round2, ZERO } from '@/lib/money'

/**
 * Coupon rules, kept pure so every branch is unit testable. The caller supplies
 * live counts from the database; this decides only whether the coupon applies
 * and for how much.
 */

export interface CouponRules {
  code: string
  type: CouponType
  value: Money
  minOrderValue: Money | null
  maxDiscountAmount: Money | null
  startsAt: Date | null
  expiresAt: Date | null
  usageLimitTotal: number | null
  usageLimitPerCustomer: number | null
  usedCount: number
  isActive: boolean
}

export interface CouponEvaluationContext {
  orderSubtotal: Money
  customerRedemptions: number
  now?: Date
}

export type CouponResult =
  | { valid: true; discount: Money; message: string }
  | { valid: false; discount: Money; reason: string }

export function evaluateCoupon(
  coupon: CouponRules,
  context: CouponEvaluationContext,
): CouponResult {
  const now = context.now ?? new Date()
  const reject = (reason: string): CouponResult => ({ valid: false, discount: ZERO(), reason })

  if (!coupon.isActive) return reject('This coupon is no longer available.')
  if (coupon.startsAt && now < coupon.startsAt) return reject('This coupon isn’t active yet.')
  if (coupon.expiresAt && now > coupon.expiresAt) return reject('This coupon has expired.')

  if (coupon.usageLimitTotal !== null && coupon.usedCount >= coupon.usageLimitTotal) {
    return reject('This coupon has been fully claimed.')
  }

  if (
    coupon.usageLimitPerCustomer !== null &&
    context.customerRedemptions >= coupon.usageLimitPerCustomer
  ) {
    return reject('You’ve already used this coupon.')
  }

  if (coupon.minOrderValue && context.orderSubtotal.lessThan(coupon.minOrderValue)) {
    return reject(
      `Add ₹${coupon.minOrderValue.minus(context.orderSubtotal).toFixed(0)} more to use this coupon.`,
    )
  }

  let discount =
    coupon.type === 'PERCENTAGE'
      ? round2(context.orderSubtotal.times(coupon.value).dividedBy(100))
      : round2(coupon.value)

  if (coupon.maxDiscountAmount && discount.greaterThan(coupon.maxDiscountAmount)) {
    discount = round2(coupon.maxDiscountAmount)
  }

  // Never let a coupon exceed the order — it must not create a negative total.
  if (discount.greaterThan(context.orderSubtotal)) discount = round2(context.orderSubtotal)

  if (discount.lessThanOrEqualTo(0)) return reject('This coupon doesn’t apply to your bag.')

  const message =
    coupon.type === 'PERCENTAGE'
      ? `${coupon.value.toFixed(0)}% off applied`
      : `₹${coupon.value.toFixed(0)} off applied`

  return { valid: true, discount, message }
}

export function couponRulesFrom(row: {
  code: string
  type: CouponType
  value: unknown
  minOrderValue: unknown
  maxDiscountAmount: unknown
  startsAt: Date | null
  expiresAt: Date | null
  usageLimitTotal: number | null
  usageLimitPerCustomer: number | null
  usedCount: number
  isActive: boolean
}): CouponRules {
  return {
    code: row.code,
    type: row.type,
    value: money(String(row.value)),
    minOrderValue: row.minOrderValue === null ? null : money(String(row.minOrderValue)),
    maxDiscountAmount: row.maxDiscountAmount === null ? null : money(String(row.maxDiscountAmount)),
    startsAt: row.startsAt,
    expiresAt: row.expiresAt,
    usageLimitTotal: row.usageLimitTotal,
    usageLimitPerCustomer: row.usageLimitPerCustomer,
    usedCount: row.usedCount,
    isActive: row.isActive,
  }
}
