import { describe, expect, it } from 'vitest'
import { financialYearLabel } from '@/modules/orders/order-number'

describe('financialYearLabel', () => {
  it('starts a new series on 1 April', () => {
    expect(financialYearLabel(new Date(2026, 3, 1))).toBe('2627')
  })

  it('keeps 31 March in the outgoing financial year', () => {
    expect(financialYearLabel(new Date(2026, 2, 31))).toBe('2526')
  })

  it('holds the same label through to December', () => {
    expect(financialYearLabel(new Date(2026, 11, 31))).toBe('2627')
  })

  it('holds the same label into the following January', () => {
    expect(financialYearLabel(new Date(2027, 0, 15))).toBe('2627')
  })

  it('labels a mid-year order with the year it was placed in', () => {
    expect(financialYearLabel(new Date(2026, 8, 5))).toBe('2627')
  })
})
