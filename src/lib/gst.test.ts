import { describe, expect, it } from 'vitest'
import { addTaxSplits, extractGst, isIntraState, SHIPPING_GST_RATE } from '@/lib/gst'
import { money } from '@/lib/money'

describe('isIntraState', () => {
  it('matches the same state regardless of casing', () => {
    expect(isIntraState('Tamil Nadu', 'tamil nadu')).toBe(true)
  })

  it('matches the same state regardless of surrounding or repeated whitespace', () => {
    expect(isIntraState('Tamil Nadu', '  Tamil   Nadu  ')).toBe(true)
  })

  it('treats a different state as inter-state', () => {
    expect(isIntraState('Tamil Nadu', 'Karnataka')).toBe(false)
  })
})

describe('extractGst', () => {
  it('extracts tax from a GST-inclusive price rather than adding it on top', () => {
    const split = extractGst(money(1099), 12, false)

    expect(split.taxableValue.toFixed(2)).toBe('981.25')
    expect(split.total.toFixed(2)).toBe('117.75')
    expect(split.taxableValue.plus(split.total).toFixed(2)).toBe('1099.00')
  })

  it('splits an intra-state sale into CGST and SGST that sum exactly to the tax', () => {
    const split = extractGst(money(1099), 12, true)

    expect(split.cgst.toFixed(2)).toBe('58.87')
    expect(split.sgst.toFixed(2)).toBe('58.88')
    expect(split.cgst.plus(split.sgst).toFixed(2)).toBe(split.total.toFixed(2))
    expect(split.igst.toFixed(2)).toBe('0.00')
  })

  it('keeps the halves adding up to the paisa when the tax does not divide evenly', () => {
    const awkward = [money(799), money(1099), money(2499), money(79), money(1)]

    for (const amount of awkward) {
      const split = extractGst(amount, 5, true)
      expect(split.cgst.plus(split.sgst).toFixed(2)).toBe(split.total.toFixed(2))
    }
  })

  it('charges IGST only on an inter-state sale', () => {
    const split = extractGst(money(1099), 12, false)

    expect(split.igst.toFixed(2)).toBe('117.75')
    expect(split.cgst.toFixed(2)).toBe('0.00')
    expect(split.sgst.toFixed(2)).toBe('0.00')
  })

  it('leaves an exempt item untaxed', () => {
    const split = extractGst(money(1000), 0, true)

    expect(split.taxableValue.toFixed(2)).toBe('1000.00')
    expect(split.total.toFixed(2)).toBe('0.00')
    expect(split.cgst.toFixed(2)).toBe('0.00')
    expect(split.sgst.toFixed(2)).toBe('0.00')
  })

  it('extracts the shipping rate from a delivery fee', () => {
    const split = extractGst(money(79), SHIPPING_GST_RATE, true)

    expect(split.taxableValue.toFixed(2)).toBe('66.95')
    expect(split.total.toFixed(2)).toBe('12.05')
    expect(split.cgst.toFixed(2)).toBe('6.02')
    expect(split.sgst.toFixed(2)).toBe('6.03')
  })

  it('accepts the rate as a Decimal as well as a number', () => {
    const fromNumber = extractGst(money(799), 5, true)
    const fromDecimal = extractGst(money(799), money(5), true)

    expect(fromDecimal.total.toFixed(2)).toBe(fromNumber.total.toFixed(2))
  })
})

describe('addTaxSplits', () => {
  it('adds each component across several lines', () => {
    const combined = addTaxSplits([
      extractGst(money(1099), 12, true),
      extractGst(money(79), SHIPPING_GST_RATE, true),
    ])

    expect(combined.cgst.toFixed(2)).toBe('64.89')
    expect(combined.sgst.toFixed(2)).toBe('64.91')
    expect(combined.igst.toFixed(2)).toBe('0.00')
    expect(combined.total.toFixed(2)).toBe('129.80')
  })

  it('returns zeroes for an empty list', () => {
    const combined = addTaxSplits([])

    expect(combined.total.toFixed(2)).toBe('0.00')
    expect(combined.taxableValue.toFixed(2)).toBe('0.00')
  })
})
