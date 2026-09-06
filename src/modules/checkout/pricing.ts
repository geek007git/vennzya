import { addTaxSplits, extractGst, isIntraState, SHIPPING_GST_RATE } from '@/lib/gst'
import { type Money, money, round2, sum, ZERO } from '@/lib/money'

/**
 * Pure pricing maths — no database, no I/O — so it can be unit tested against
 * the exact rupee amounts a customer will be charged.
 *
 * Catalogue prices are GST-inclusive, so the shopper pays the price on the tag.
 * Discounts are allocated across lines in proportion to line value, which keeps
 * each line's tax correct and makes the invoice add up.
 */

export interface PricingLineInput {
  variantId: string
  unitPrice: Money
  quantity: number
  gstRatePercent: Money
}

export interface PricedLine {
  variantId: string
  unitPrice: Money
  quantity: number
  lineSubtotal: Money
  lineDiscount: Money
  lineTotal: Money
  lineTaxAmount: Money
  gstRatePercent: Money
}

export interface OrderTotals {
  lines: PricedLine[]
  subtotal: Money
  discountAmount: Money
  shippingFee: Money
  cgstAmount: Money
  sgstAmount: Money
  igstAmount: Money
  taxableAmount: Money
  totalAmount: Money
}

export interface PricingContext {
  sellerState: string
  shippingState: string
  freeShippingThreshold: Money
  standardShippingFee: Money
}

/**
 * Distributes a discount across lines proportionally, giving any rounding
 * remainder to the largest line so the parts always sum to the whole.
 */
export function allocateDiscount(lineSubtotals: Money[], discount: Money): Money[] {
  const total = sum(lineSubtotals)
  if (total.lessThanOrEqualTo(0) || discount.lessThanOrEqualTo(0)) {
    return lineSubtotals.map(() => ZERO())
  }

  const capped = discount.greaterThan(total) ? total : discount
  const allocations = lineSubtotals.map((lineSubtotal) =>
    round2(lineSubtotal.dividedBy(total).times(capped)),
  )

  const allocated = sum(allocations)
  const remainder = round2(capped.minus(allocated))

  if (!remainder.isZero() && allocations.length > 0) {
    let largestIndex = 0
    for (let i = 1; i < lineSubtotals.length; i++) {
      const current = lineSubtotals[i]
      const largest = lineSubtotals[largestIndex]
      if (current && largest && current.greaterThan(largest)) largestIndex = i
    }
    const target = allocations[largestIndex]
    if (target) allocations[largestIndex] = round2(target.plus(remainder))
  }

  return allocations
}

export function calculateOrderTotals(
  inputs: PricingLineInput[],
  discount: Money,
  context: PricingContext,
): OrderTotals {
  const lineSubtotals = inputs.map((line) => round2(line.unitPrice.times(line.quantity)))
  const discounts = allocateDiscount(lineSubtotals, discount)
  const intraState = isIntraState(context.sellerState, context.shippingState)

  const lines: PricedLine[] = inputs.map((line, index) => {
    const lineSubtotal = lineSubtotals[index] ?? ZERO()
    const lineDiscount = discounts[index] ?? ZERO()
    const lineTotal = round2(lineSubtotal.minus(lineDiscount))
    const split = extractGst(lineTotal, line.gstRatePercent, intraState)

    return {
      variantId: line.variantId,
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      lineSubtotal,
      lineDiscount,
      lineTotal,
      lineTaxAmount: split.total,
      gstRatePercent: line.gstRatePercent,
    }
  })

  const subtotal = round2(sum(lineSubtotals))
  const discountAmount = round2(sum(discounts))
  const goodsTotal = round2(sum(lines.map((line) => line.lineTotal)))

  const shippingFee = goodsTotal.greaterThanOrEqualTo(context.freeShippingThreshold)
    ? ZERO()
    : context.standardShippingFee

  const taxSplits = lines.map((line, index) => {
    const source = inputs[index]
    return extractGst(line.lineTotal, source?.gstRatePercent ?? money(0), intraState)
  })

  if (shippingFee.greaterThan(0)) {
    taxSplits.push(extractGst(shippingFee, SHIPPING_GST_RATE, intraState))
  }

  const tax = addTaxSplits(taxSplits)

  return {
    lines,
    subtotal,
    discountAmount,
    shippingFee,
    cgstAmount: round2(tax.cgst),
    sgstAmount: round2(tax.sgst),
    igstAmount: round2(tax.igst),
    taxableAmount: round2(tax.taxableValue),
    totalAmount: round2(goodsTotal.plus(shippingFee)),
  }
}
