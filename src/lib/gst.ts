import { type Money, money, round2 } from '@/lib/money'

/**
 * Catalogue prices are GST-inclusive (standard Indian retail practice: the
 * shopper pays exactly the price on the tag). Tax is therefore *extracted*
 * from the price, never added on top.
 *
 * Place of supply decides the split:
 *   shipping state == seller state  → CGST + SGST, half the rate each
 *   otherwise                       → IGST at the full rate
 */

export const SHIPPING_GST_RATE = 18

export interface TaxSplit {
  taxableValue: Money
  cgst: Money
  sgst: Money
  igst: Money
  total: Money
}

export function isIntraState(sellerState: string, shippingState: string): boolean {
  return normalizeState(sellerState) === normalizeState(shippingState)
}

function normalizeState(state: string): string {
  return state.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Splits a GST-inclusive amount into its taxable value and tax components. */
export function extractGst(
  inclusiveAmount: Money,
  ratePercent: Money | number,
  intraState: boolean,
): TaxSplit {
  const rate = money(ratePercent)
  const taxableValue = round2(inclusiveAmount.times(100).dividedBy(rate.plus(100)))
  const taxTotal = round2(inclusiveAmount.minus(taxableValue))

  if (intraState) {
    // Half to each; give any rounding remainder to CGST so the parts still
    // add up to taxTotal exactly.
    const sgst = round2(taxTotal.dividedBy(2))
    const cgst = round2(taxTotal.minus(sgst))
    return { taxableValue, cgst, sgst, igst: money(0), total: taxTotal }
  }

  return { taxableValue, cgst: money(0), sgst: money(0), igst: taxTotal, total: taxTotal }
}

export function addTaxSplits(splits: TaxSplit[]): Omit<TaxSplit, 'taxableValue'> & {
  taxableValue: Money
} {
  return splits.reduce<TaxSplit>(
    (acc, s) => ({
      taxableValue: acc.taxableValue.plus(s.taxableValue),
      cgst: acc.cgst.plus(s.cgst),
      sgst: acc.sgst.plus(s.sgst),
      igst: acc.igst.plus(s.igst),
      total: acc.total.plus(s.total),
    }),
    { taxableValue: money(0), cgst: money(0), sgst: money(0), igst: money(0), total: money(0) },
  )
}
