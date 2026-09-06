import { TRPCError } from '@trpc/server'
import { nanoid } from 'nanoid'
import type { Prisma } from '@/generated/prisma/client'
import { env } from '@/lib/env'
import { normalizePhone } from '@/lib/india'
import { logger } from '@/lib/logger'
import { type Money, money, round2, sum, toNumber, toPaise, ZERO } from '@/lib/money'
import { siteConfig } from '@/lib/site-config'
import { catalogService } from '@/modules/catalog/service'
import { couponRulesFrom, evaluateCoupon } from '@/modules/discounts/coupon-engine'
import { nextOrderNumber } from '@/modules/orders/order-number'
import { createRazorpayOrder, isRazorpayConfigured } from '@/modules/payments/razorpay'
import { db } from '@/server/db'
import { calculateOrderTotals, type PricingContext } from './pricing'
import type { AddressInput, PlaceOrderInput } from './schema'

const STANDARD_SHIPPING_FEE = money(79)

function pricingContext(shippingState: string): PricingContext {
  return {
    sellerState: env.SELLER_STATE,
    shippingState,
    freeShippingThreshold: money(siteConfig.freeShippingThreshold),
    standardShippingFee: STANDARD_SHIPPING_FEE,
  }
}

const variantForCheckoutSelect = {
  id: true,
  sku: true,
  price: true,
  stockQuantity: true,
  isActive: true,
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      hsnCode: true,
      gstRatePercent: true,
      images: {
        where: { variantId: null },
        orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        take: 1,
        select: { url: true },
      },
    },
  },
  optionValues: {
    select: { optionValue: { select: { value: true, option: { select: { name: true } } } } },
  },
} satisfies Prisma.ProductVariantSelect

type CheckoutVariant = Prisma.ProductVariantGetPayload<{ select: typeof variantForCheckoutSelect }>

export interface QuoteLineView {
  variantId: string
  productName: string
  productSlug: string
  sku: string
  variantLabel: string
  imageUrl: string | null
  unitPrice: number
  quantity: number
  lineTotal: number
  availableStock: number
}

export interface QuoteView {
  lines: QuoteLineView[]
  subtotal: number
  discountAmount: number
  shippingFee: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  totalAmount: number
  coupon: { code: string; message: string } | null
  couponError: string | null
  /** Lines that had to be reduced or dropped because stock moved. */
  adjustments: string[]
}

function variantLabel(variant: CheckoutVariant): string {
  return variant.optionValues
    .map((ov) => `${ov.optionValue.option.name} ${ov.optionValue.value}`)
    .join(' · ')
}

async function loadVariants(variantIds: string[]): Promise<Map<string, CheckoutVariant>> {
  const rows = await db.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: variantForCheckoutSelect,
  })
  return new Map(rows.map((row) => [row.id, row]))
}

async function resolveCoupon(
  code: string | undefined,
  orderSubtotal: Money,
  userId: string | null,
): Promise<{
  couponId: string | null
  code: string | null
  discount: Money
  message: string | null
  error: string | null
}> {
  if (!code) return { couponId: null, code: null, discount: ZERO(), message: null, error: null }

  const coupon = await db.coupon.findUnique({ where: { code: code.toUpperCase() } })
  if (!coupon) {
    return {
      couponId: null,
      code: null,
      discount: ZERO(),
      message: null,
      error: 'That coupon code isn’t valid.',
    }
  }

  const customerRedemptions = userId
    ? await db.couponRedemption.count({ where: { couponId: coupon.id, userId } })
    : 0

  const result = evaluateCoupon(couponRulesFrom(coupon), { orderSubtotal, customerRedemptions })

  if (!result.valid) {
    return { couponId: null, code: null, discount: ZERO(), message: null, error: result.reason }
  }

  return {
    couponId: coupon.id,
    code: coupon.code,
    discount: result.discount,
    message: result.message,
    error: null,
  }
}

export const checkoutService = {
  /**
   * Prices the bag without writing anything. The checkout summary and the
   * order both run through the same maths, so what a shopper sees is what
   * they are charged.
   */
  async quote(
    items: { variantId: string; quantity: number }[],
    options: {
      couponCode?: string | undefined
      state?: string | undefined
      userId?: string | null
    },
  ): Promise<QuoteView> {
    const variants = await loadVariants(items.map((item) => item.variantId))
    const adjustments: string[] = []

    const usable = items.flatMap((item) => {
      const variant = variants.get(item.variantId)

      if (!variant?.isActive || variant.product.status !== 'ACTIVE') {
        adjustments.push('An item in your bag is no longer available and was removed.')
        return []
      }

      if (variant.stockQuantity <= 0) {
        adjustments.push(`${variant.product.name} just sold out and was removed.`)
        return []
      }

      const quantity = Math.min(item.quantity, variant.stockQuantity)
      if (quantity < item.quantity) {
        adjustments.push(
          `Only ${variant.stockQuantity} left of ${variant.product.name} — quantity reduced.`,
        )
      }

      return [{ variant, quantity }]
    })

    if (usable.length === 0) {
      return {
        lines: [],
        subtotal: 0,
        discountAmount: 0,
        shippingFee: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalAmount: 0,
        coupon: null,
        couponError: null,
        adjustments,
      }
    }

    const subtotal = round2(
      sum(
        usable.map(({ variant, quantity }) =>
          round2(money(variant.price.toString()).times(quantity)),
        ),
      ),
    )

    const coupon = await resolveCoupon(options.couponCode, subtotal, options.userId ?? null)

    const totals = calculateOrderTotals(
      usable.map(({ variant, quantity }) => ({
        variantId: variant.id,
        unitPrice: money(variant.price.toString()),
        quantity,
        gstRatePercent: money(variant.product.gstRatePercent.toString()),
      })),
      coupon.discount,
      pricingContext(options.state ?? env.SELLER_STATE),
    )

    return {
      lines: usable.map(({ variant, quantity }, index) => {
        const priced = totals.lines[index]
        return {
          variantId: variant.id,
          productName: variant.product.name,
          productSlug: variant.product.slug,
          sku: variant.sku,
          variantLabel: variantLabel(variant),
          imageUrl: variant.product.images[0]?.url ?? null,
          unitPrice: toNumber(variant.price.toString()),
          quantity,
          lineTotal: toNumber(priced?.lineTotal ?? ZERO()),
          availableStock: variant.stockQuantity,
        }
      }),
      subtotal: toNumber(totals.subtotal),
      discountAmount: toNumber(totals.discountAmount),
      shippingFee: toNumber(totals.shippingFee),
      cgstAmount: toNumber(totals.cgstAmount),
      sgstAmount: toNumber(totals.sgstAmount),
      igstAmount: toNumber(totals.igstAmount),
      totalAmount: toNumber(totals.totalAmount),
      coupon: coupon.code && coupon.message ? { code: coupon.code, message: coupon.message } : null,
      couponError: coupon.error,
      adjustments,
    }
  },

  async placeOrder(input: PlaceOrderInput, sessionUserId: string | null) {
    if (input.paymentMethod === 'RAZORPAY' && !isRazorpayConfigured()) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Online payment is unavailable right now. Please choose Cash on Delivery.',
      })
    }

    const variants = await loadVariants(input.items.map((item) => item.variantId))

    const lines = input.items.map((item) => {
      const variant = variants.get(item.variantId)

      if (!variant?.isActive || variant.product.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'An item in your bag is no longer available. Please review your bag.',
        })
      }

      if (variant.stockQuantity < item.quantity) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Only ${variant.stockQuantity} left of ${variant.product.name}. Please update your bag.`,
        })
      }

      return { variant, quantity: item.quantity }
    })

    const phone = normalizePhone(input.shippingAddress.phone)
    const subtotal = round2(
      sum(
        lines.map(({ variant, quantity }) =>
          round2(money(variant.price.toString()).times(quantity)),
        ),
      ),
    )

    const userId = sessionUserId ?? (await resolveGuestUserId(phone, input))
    const coupon = await resolveCoupon(input.couponCode, subtotal, userId)

    if (input.couponCode && coupon.error) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: coupon.error })
    }

    const totals = calculateOrderTotals(
      lines.map(({ variant, quantity }) => ({
        variantId: variant.id,
        unitPrice: money(variant.price.toString()),
        quantity,
        gstRatePercent: money(variant.product.gstRatePercent.toString()),
      })),
      coupon.discount,
      pricingContext(input.shippingAddress.state),
    )

    const isCod = input.paymentMethod === 'COD'
    const guestAccessToken = nanoid(32)

    const order = await db.$transaction(async (tx) => {
      // Conditional decrement: if another checkout took the last one between
      // our read and this write, the update matches zero rows and we bail out
      // before any money moves.
      for (const { variant, quantity } of lines) {
        const claimed = await tx.productVariant.updateMany({
          where: { id: variant.id, stockQuantity: { gte: quantity } },
          data: { stockQuantity: { decrement: quantity } },
        })

        if (claimed.count !== 1) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `${variant.product.name} sold out while you were checking out. Nothing has been charged.`,
          })
        }
      }

      const orderNumber = await nextOrderNumber(tx)

      const created = await tx.order.create({
        data: {
          orderNumber,
          userId,
          status: isCod ? 'CONFIRMED' : 'CREATED',
          paymentStatus: isCod ? 'COD_PENDING' : 'PENDING',
          shippingStatus: 'NOT_SHIPPED',
          paymentMethod: input.paymentMethod,
          subtotal: totals.subtotal.toFixed(2),
          discountAmount: totals.discountAmount.toFixed(2),
          shippingFee: totals.shippingFee.toFixed(2),
          cgstAmount: totals.cgstAmount.toFixed(2),
          sgstAmount: totals.sgstAmount.toFixed(2),
          igstAmount: totals.igstAmount.toFixed(2),
          totalAmount: totals.totalAmount.toFixed(2),
          couponId: coupon.couponId,
          couponCodeSnapshot: coupon.code,
          contactEmail: input.email ?? null,
          contactPhone: phone,
          customerNote: input.customerNote ?? null,
          guestAccessToken,
          ...(isCod ? { confirmedAt: new Date() } : {}),
          items: {
            create: lines.map(({ variant, quantity }, index) => {
              const priced = totals.lines[index]
              return {
                variantId: variant.id,
                productNameSnapshot: variant.product.name,
                productSlugSnapshot: variant.product.slug,
                skuSnapshot: variant.sku,
                imageUrlSnapshot: variant.product.images[0]?.url ?? null,
                variantAttributesSnapshot: Object.fromEntries(
                  variant.optionValues.map((ov) => [
                    ov.optionValue.option.name,
                    ov.optionValue.value,
                  ]),
                ),
                hsnCodeSnapshot: variant.product.hsnCode,
                gstRateSnapshot: variant.product.gstRatePercent,
                unitPrice: variant.price,
                quantity,
                lineSubtotal: (priced?.lineSubtotal ?? ZERO()).toFixed(2),
                lineDiscount: (priced?.lineDiscount ?? ZERO()).toFixed(2),
                lineTaxAmount: (priced?.lineTaxAmount ?? ZERO()).toFixed(2),
                lineTotal: (priced?.lineTotal ?? ZERO()).toFixed(2),
              }
            }),
          },
          addresses: {
            create: [
              toOrderAddress('SHIPPING', input.shippingAddress),
              toOrderAddress(
                'BILLING',
                input.billingSameAsShipping
                  ? input.shippingAddress
                  : (input.billingAddress ?? input.shippingAddress),
              ),
            ],
          },
          payments: {
            create: {
              provider: isCod ? 'COD' : 'RAZORPAY',
              amount: totals.totalAmount.toFixed(2),
              status: isCod ? 'COD_AWAITING' : 'CREATED',
              ...(isCod ? { method: 'cod' } : {}),
            },
          },
        },
        select: { id: true, orderNumber: true, totalAmount: true },
      })

      await tx.stockMovement.createMany({
        data: lines.map(({ variant, quantity }) => ({
          variantId: variant.id,
          type: 'SALE' as const,
          quantityDelta: -quantity,
          resultingStock: variant.stockQuantity - quantity,
          orderId: created.id,
          note: `Order ${created.orderNumber}`,
        })),
      })

      if (coupon.couponId) {
        await tx.coupon.update({
          where: { id: coupon.couponId },
          data: { usedCount: { increment: 1 } },
        })
        await tx.couponRedemption.create({
          data: {
            couponId: coupon.couponId,
            orderId: created.id,
            userId,
            discountAmount: totals.discountAmount.toFixed(2),
          },
        })
      }

      for (const productId of new Set(lines.map(({ variant }) => variant.product.id))) {
        await catalogService.syncProductAggregates(productId, tx)
      }

      return created
    })

    logger.info(
      { orderId: order.id, orderNumber: order.orderNumber, method: input.paymentMethod },
      'order placed',
    )

    if (isCod) {
      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        guestAccessToken,
        totalAmount: toNumber(totals.totalAmount),
        razorpay: null,
      }
    }

    const razorpayOrder = await createRazorpayOrder({
      amountInPaise: toPaise(totals.totalAmount),
      receipt: order.orderNumber,
      notes: { orderId: order.id, orderNumber: order.orderNumber },
    })

    await db.payment.updateMany({
      where: { orderId: order.id, status: 'CREATED' },
      data: { razorpayOrderId: razorpayOrder.razorpayOrderId },
    })

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      guestAccessToken,
      totalAmount: toNumber(totals.totalAmount),
      razorpay: razorpayOrder,
    }
  },
}

function toOrderAddress(kind: 'SHIPPING' | 'BILLING', address: AddressInput) {
  return {
    kind,
    fullName: address.fullName,
    phone: normalizePhone(address.phone),
    line1: address.line1,
    line2: address.line2 ?? null,
    landmark: address.landmark ?? null,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
  }
}

/**
 * Guests still get a Customer record, keyed on phone — that is what makes
 * order history, coupon limits and repeat-customer support work later without
 * forcing anyone to register now.
 */
async function resolveGuestUserId(phone: string, input: PlaceOrderInput): Promise<string> {
  const existing = await db.user.findUnique({ where: { phoneNumber: phone }, select: { id: true } })
  if (existing) return existing.id

  const emailTaken = input.email
    ? await db.user.findUnique({ where: { email: input.email }, select: { id: true } })
    : null

  const created = await db.user.create({
    data: {
      phoneNumber: phone,
      name: input.shippingAddress.fullName,
      email: emailTaken ? null : (input.email ?? null),
      role: 'CUSTOMER',
    },
    select: { id: true },
  })

  return created.id
}
