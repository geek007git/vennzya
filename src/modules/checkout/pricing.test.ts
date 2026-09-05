import { describe, expect, it } from 'vitest'
import { type Money, money, sum } from '@/lib/money'
import {
  allocateDiscount,
  calculateOrderTotals,
  type PricingContext,
  type PricingLineInput,
} from '@/modules/checkout/pricing'

function context(overrides: Partial<PricingContext> = {}): PricingContext {
  return {
    sellerState: 'Tamil Nadu',
    shippingState: 'Tamil Nadu',
    freeShippingThreshold: money(1499),
    standardShippingFee: money(79),
    ...overrides,
  }
}

function line(
  unitPrice: number,
  gstRatePercent: number,
  quantity = 1,
  variantId = 'v1',
): PricingLineInput {
  return {
    variantId,
    unitPrice: money(unitPrice),
    quantity,
    gstRatePercent: money(gstRatePercent),
  }
}

function totalOf(values: Money[]): string {
  return sum(values).toFixed(2)
}

describe('allocateDiscount', () => {
  it('gives nothing away when the discount is zero', () => {
    const allocations = allocateDiscount([money(100), money(200)], money(0))

    expect(totalOf(allocations)).toBe('0.00')
  })

  it('gives the whole discount to a single line', () => {
    const allocations = allocateDiscount([money(250)], money(37.77))

    expect(allocations[0]?.toFixed(2)).toBe('37.77')
  })

  it('still sums to the discount when it cannot be split evenly', () => {
    const allocations = allocateDiscount([money(100), money(100), money(100)], money(100))

    expect(totalOf(allocations)).toBe('100.00')
    expect(allocations[0]?.toFixed(2)).toBe('33.34')
    expect(allocations[1]?.toFixed(2)).toBe('33.33')
    expect(allocations[2]?.toFixed(2)).toBe('33.33')
  })

  it('claws back an over-allocation from the largest line', () => {
    const allocations = allocateDiscount([money(1), money(1), money(4)], money(1))

    expect(totalOf(allocations)).toBe('1.00')
    expect(allocations[2]?.toFixed(2)).toBe('0.66')
  })

  it('caps a discount larger than the order at the order value', () => {
    const allocations = allocateDiscount([money(100), money(50)], money(500))

    expect(totalOf(allocations)).toBe('150.00')
  })

  it('allocates nothing across empty lines', () => {
    expect(allocateDiscount([], money(100))).toHaveLength(0)
  })

  it('allocates in proportion to line value', () => {
    const allocations = allocateDiscount([money(100), money(300)], money(80))

    expect(allocations[0]?.toFixed(2)).toBe('20.00')
    expect(allocations[1]?.toFixed(2)).toBe('60.00')
  })
})

describe('calculateOrderTotals', () => {
  it('waives shipping exactly at the free shipping threshold', () => {
    const totals = calculateOrderTotals([line(1499, 12)], money(0), context())

    expect(totals.shippingFee.toFixed(2)).toBe('0.00')
    expect(totals.totalAmount.toFixed(2)).toBe('1499.00')
  })

  it('charges shipping one rupee below the threshold', () => {
    const totals = calculateOrderTotals([line(1498, 12)], money(0), context())

    expect(totals.shippingFee.toFixed(2)).toBe('79.00')
    expect(totals.totalAmount.toFixed(2)).toBe('1577.00')
  })

  it('totals to subtotal minus discount plus shipping', () => {
    const totals = calculateOrderTotals(
      [line(1000, 5, 1, 'a'), line(500, 12, 1, 'b')],
      money(200),
      context(),
    )

    expect(totals.subtotal.toFixed(2)).toBe('1500.00')
    expect(totals.discountAmount.toFixed(2)).toBe('200.00')
    expect(totals.shippingFee.toFixed(2)).toBe('79.00')
    expect(totals.totalAmount.toFixed(2)).toBe('1379.00')
  })

  it('applies the discount before deciding on free shipping', () => {
    const totals = calculateOrderTotals([line(1600, 12)], money(200), context())

    expect(totals.shippingFee.toFixed(2)).toBe('79.00')
    expect(totals.totalAmount.toFixed(2)).toBe('1479.00')
  })

  it('taxes the delivery fee at the shipping rate when one is charged', () => {
    const totals = calculateOrderTotals([line(1000, 5)], money(0), context())

    expect(totals.cgstAmount.toFixed(2)).toBe('29.83')
    expect(totals.sgstAmount.toFixed(2)).toBe('29.84')
    expect(totals.igstAmount.toFixed(2)).toBe('0.00')
    expect(totals.totalAmount.toFixed(2)).toBe('1079.00')
  })

  it('adds no shipping tax when delivery is free', () => {
    const totals = calculateOrderTotals([line(1499, 12)], money(0), context())

    expect(totals.cgstAmount.toFixed(2)).toBe('80.30')
    expect(totals.sgstAmount.toFixed(2)).toBe('80.31')
    expect(totals.cgstAmount.plus(totals.sgstAmount).toFixed(2)).toBe('160.61')
  })

  it('charges IGST alone when shipping outside the seller state', () => {
    const totals = calculateOrderTotals(
      [line(1000, 5)],
      money(0),
      context({ shippingState: 'Karnataka' }),
    )

    expect(totals.igstAmount.toFixed(2)).toBe('59.67')
    expect(totals.cgstAmount.toFixed(2)).toBe('0.00')
    expect(totals.sgstAmount.toFixed(2)).toBe('0.00')
  })

  it('keeps taxable value plus tax equal to the amount charged', () => {
    const totals = calculateOrderTotals(
      [line(1000, 5, 1, 'a'), line(349, 12, 2, 'b')],
      money(150),
      context(),
    )

    const taxCharged = totals.cgstAmount.plus(totals.sgstAmount).plus(totals.igstAmount)
    expect(totals.taxableAmount.plus(taxCharged).toFixed(2)).toBe(totals.totalAmount.toFixed(2))
  })

  it('multiplies unit price by quantity for each line', () => {
    const totals = calculateOrderTotals([line(250, 12, 3)], money(0), context())

    expect(totals.subtotal.toFixed(2)).toBe('750.00')
    expect(totals.lines[0]?.lineSubtotal.toFixed(2)).toBe('750.00')
    expect(totals.lines[0]?.quantity).toBe(3)
  })

  it('records the discount taken from each line', () => {
    const totals = calculateOrderTotals(
      [line(100, 12, 1, 'a'), line(300, 12, 1, 'b')],
      money(80),
      context(),
    )

    expect(totals.lines[0]?.lineDiscount.toFixed(2)).toBe('20.00')
    expect(totals.lines[0]?.lineTotal.toFixed(2)).toBe('80.00')
    expect(totals.lines[1]?.lineDiscount.toFixed(2)).toBe('60.00')
    expect(totals.lines[1]?.lineTotal.toFixed(2)).toBe('240.00')
  })

  it('never produces a negative total when the discount swallows the order', () => {
    const totals = calculateOrderTotals([line(500, 12)], money(9999), context())

    expect(totals.discountAmount.toFixed(2)).toBe('500.00')
    expect(totals.totalAmount.toFixed(2)).toBe('79.00')
  })
})
