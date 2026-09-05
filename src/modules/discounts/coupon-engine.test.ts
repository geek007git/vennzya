import { describe, expect, it } from 'vitest'
import { type Money, money } from '@/lib/money'
import {
  type CouponResult,
  type CouponRules,
  couponRulesFrom,
  evaluateCoupon,
} from '@/modules/discounts/coupon-engine'

const NOW = new Date('2026-06-15T10:00:00.000Z')

function coupon(overrides: Partial<CouponRules> = {}): CouponRules {
  return {
    code: 'WELCOME10',
    type: 'PERCENTAGE',
    value: money(10),
    minOrderValue: null,
    maxDiscountAmount: null,
    startsAt: null,
    expiresAt: null,
    usageLimitTotal: null,
    usageLimitPerCustomer: null,
    usedCount: 0,
    isActive: true,
    ...overrides,
  }
}

function accepted(result: CouponResult): { discount: Money; message: string } {
  if (!result.valid) throw new Error(`expected the coupon to apply, but got: ${result.reason}`)
  return result
}

function rejected(result: CouponResult): { discount: Money; reason: string } {
  if (result.valid) throw new Error(`expected a rejection, but got: ${result.message}`)
  return result
}

describe('evaluateCoupon rejections', () => {
  it('turns down a deactivated coupon', () => {
    const result = rejected(
      evaluateCoupon(coupon({ isActive: false }), {
        orderSubtotal: money(2000),
        customerRedemptions: 0,
        now: NOW,
      }),
    )

    expect(result.reason).toBe('This coupon is no longer available.')
    expect(result.discount.toFixed(2)).toBe('0.00')
  })

  it('turns down a coupon whose start date has not arrived', () => {
    const result = rejected(
      evaluateCoupon(coupon({ startsAt: new Date('2026-07-01T00:00:00.000Z') }), {
        orderSubtotal: money(2000),
        customerRedemptions: 0,
        now: NOW,
      }),
    )

    expect(result.reason).toBe('This coupon isn’t active yet.')
  })

  it('turns down an expired coupon', () => {
    const result = rejected(
      evaluateCoupon(coupon({ expiresAt: new Date('2026-06-01T00:00:00.000Z') }), {
        orderSubtotal: money(2000),
        customerRedemptions: 0,
        now: NOW,
      }),
    )

    expect(result.reason).toBe('This coupon has expired.')
  })

  it('turns down a coupon that has been fully claimed', () => {
    const result = rejected(
      evaluateCoupon(coupon({ usageLimitTotal: 100, usedCount: 100 }), {
        orderSubtotal: money(2000),
        customerRedemptions: 0,
        now: NOW,
      }),
    )

    expect(result.reason).toBe('This coupon has been fully claimed.')
  })

  it('turns down a customer who has already used their allowance', () => {
    const result = rejected(
      evaluateCoupon(coupon({ usageLimitPerCustomer: 1 }), {
        orderSubtotal: money(2000),
        customerRedemptions: 1,
        now: NOW,
      }),
    )

    expect(result.reason).toBe('You’ve already used this coupon.')
  })

  it('tells the shopper how much more they need to reach the minimum', () => {
    const result = rejected(
      evaluateCoupon(coupon({ minOrderValue: money(999) }), {
        orderSubtotal: money(500),
        customerRedemptions: 0,
        now: NOW,
      }),
    )

    expect(result.reason).toBe('Add ₹499 more to use this coupon.')
  })

  it('turns down a coupon worth nothing', () => {
    const result = rejected(
      evaluateCoupon(coupon({ type: 'FLAT', value: money(0) }), {
        orderSubtotal: money(2000),
        customerRedemptions: 0,
        now: NOW,
      }),
    )

    expect(result.reason).toBe('This coupon doesn’t apply to your bag.')
  })
})

describe('evaluateCoupon acceptances', () => {
  it('takes a percentage off the order', () => {
    const result = accepted(
      evaluateCoupon(coupon({ value: money(10) }), {
        orderSubtotal: money(2000),
        customerRedemptions: 0,
        now: NOW,
      }),
    )

    expect(result.discount.toFixed(2)).toBe('200.00')
    expect(result.message).toBe('10% off applied')
  })

  it('takes a flat amount off the order', () => {
    const result = accepted(
      evaluateCoupon(coupon({ type: 'FLAT', value: money(300) }), {
        orderSubtotal: money(2000),
        customerRedemptions: 0,
        now: NOW,
      }),
    )

    expect(result.discount.toFixed(2)).toBe('300.00')
    expect(result.message).toBe('₹300 off applied')
  })

  it('caps a percentage coupon at its maximum discount', () => {
    const result = accepted(
      evaluateCoupon(coupon({ value: money(20), maxDiscountAmount: money(500) }), {
        orderSubtotal: money(5000),
        customerRedemptions: 0,
        now: NOW,
      }),
    )

    expect(result.discount.toFixed(2)).toBe('500.00')
  })

  it('never discounts more than the order is worth', () => {
    const result = accepted(
      evaluateCoupon(coupon({ type: 'FLAT', value: money(500) }), {
        orderSubtotal: money(200),
        customerRedemptions: 0,
        now: NOW,
      }),
    )

    expect(result.discount.toFixed(2)).toBe('200.00')
  })

  it('accepts an order sitting exactly on the minimum', () => {
    const result = accepted(
      evaluateCoupon(coupon({ minOrderValue: money(999) }), {
        orderSubtotal: money(999),
        customerRedemptions: 0,
        now: NOW,
      }),
    )

    expect(result.discount.toFixed(2)).toBe('99.90')
  })

  it('accepts the last remaining use of a limited coupon', () => {
    const result = accepted(
      evaluateCoupon(coupon({ usageLimitTotal: 100, usedCount: 99 }), {
        orderSubtotal: money(2000),
        customerRedemptions: 0,
        now: NOW,
      }),
    )

    expect(result.discount.toFixed(2)).toBe('200.00')
  })

  it('rounds a percentage discount to the paisa', () => {
    const result = accepted(
      evaluateCoupon(coupon({ value: money(10) }), {
        orderSubtotal: money(1099),
        customerRedemptions: 0,
        now: NOW,
      }),
    )

    expect(result.discount.toFixed(2)).toBe('109.90')
  })
})

describe('couponRulesFrom', () => {
  it('reads Decimal columns without losing precision', () => {
    const rules = couponRulesFrom({
      code: 'FLAT300',
      type: 'FLAT',
      value: '300.00',
      minOrderValue: '1999.00',
      maxDiscountAmount: null,
      startsAt: null,
      expiresAt: null,
      usageLimitTotal: null,
      usageLimitPerCustomer: null,
      usedCount: 0,
      isActive: true,
    })

    expect(rules.value.toFixed(2)).toBe('300.00')
    expect(rules.minOrderValue?.toFixed(2)).toBe('1999.00')
    expect(rules.maxDiscountAmount).toBeNull()
  })
})
