import type { Prisma } from '@/generated/prisma/client'
import { logger } from '@/lib/logger'
import { catalogService } from '@/modules/catalog/service'
import { db } from '@/server/db'

/**
 * Two paths report a payment: the browser callback (fast, but the shopper can
 * close the tab) and the Razorpay webhook (authoritative, retried). Both land
 * here, and this must be safe to run any number of times for the same payment.
 */

export type ConfirmOutcome = 'confirmed' | 'already-confirmed' | 'not-found'

export async function confirmPayment(params: {
  razorpayOrderId: string
  razorpayPaymentId: string
  signature?: string | undefined
  method?: string | undefined
  rawPayload?: Prisma.InputJsonValue | undefined
}): Promise<{ outcome: ConfirmOutcome; orderId: string | null; orderNumber: string | null }> {
  const payment = await db.payment.findUnique({
    where: { razorpayOrderId: params.razorpayOrderId },
    select: {
      id: true,
      status: true,
      order: { select: { id: true, orderNumber: true } },
    },
  })

  if (!payment) {
    logger.warn(
      { razorpayOrderId: params.razorpayOrderId },
      'payment confirm: unknown razorpay order',
    )
    return { outcome: 'not-found', orderId: null, orderNumber: null }
  }

  if (payment.status === 'CAPTURED') {
    return {
      outcome: 'already-confirmed',
      orderId: payment.order.id,
      orderNumber: payment.order.orderNumber,
    }
  }

  // The conditional `status: 'CREATED'` is the idempotency guard: whichever of
  // the two paths arrives first wins, the second updates zero rows.
  const claimed = await db.payment.updateMany({
    where: { id: payment.id, status: { in: ['CREATED', 'AUTHORIZED'] } },
    data: {
      status: 'CAPTURED',
      razorpayPaymentId: params.razorpayPaymentId,
      razorpaySignature: params.signature ?? null,
      method: params.method ?? null,
      verifiedAt: new Date(),
      ...(params.rawPayload ? { rawPayload: params.rawPayload } : {}),
    },
  })

  if (claimed.count !== 1) {
    return {
      outcome: 'already-confirmed',
      orderId: payment.order.id,
      orderNumber: payment.order.orderNumber,
    }
  }

  await db.order.update({
    where: { id: payment.order.id },
    data: { status: 'CONFIRMED', paymentStatus: 'PAID', confirmedAt: new Date() },
  })

  logger.info({ orderNumber: payment.order.orderNumber }, 'payment confirmed')

  return {
    outcome: 'confirmed',
    orderId: payment.order.id,
    orderNumber: payment.order.orderNumber,
  }
}

/**
 * A failed payment releases the stock the pending order was holding, so a
 * abandoned checkout can't keep a piece off the shelf indefinitely.
 */
export async function failPayment(params: {
  razorpayOrderId: string
  reason?: string | undefined
  rawPayload?: Prisma.InputJsonValue | undefined
}): Promise<{ outcome: 'failed' | 'already-settled' | 'not-found' }> {
  const payment = await db.payment.findUnique({
    where: { razorpayOrderId: params.razorpayOrderId },
    select: {
      id: true,
      status: true,
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          items: { select: { variantId: true, quantity: true } },
        },
      },
    },
  })

  if (!payment) return { outcome: 'not-found' }
  if (payment.status === 'CAPTURED' || payment.status === 'FAILED') {
    return { outcome: 'already-settled' }
  }

  const affectedProductIds = await db.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: { in: ['CREATED', 'AUTHORIZED'] } },
      data: {
        status: 'FAILED',
        failureReason: params.reason ?? null,
        ...(params.rawPayload ? { rawPayload: params.rawPayload } : {}),
      },
    })

    if (claimed.count !== 1) return []

    await tx.order.update({
      where: { id: payment.order.id },
      data: {
        status: 'CANCELLED',
        paymentStatus: 'FAILED',
        cancelledAt: new Date(),
        cancelReason: params.reason ?? 'Payment failed',
      },
    })

    const productIds = new Set<string>()

    for (const item of payment.order.items) {
      if (!item.variantId) continue

      const restored = await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stockQuantity: { increment: item.quantity } },
        select: { stockQuantity: true, productId: true },
      })

      await tx.stockMovement.create({
        data: {
          variantId: item.variantId,
          type: 'CANCELLATION',
          quantityDelta: item.quantity,
          resultingStock: restored.stockQuantity,
          orderId: payment.order.id,
          note: `Payment failed for ${payment.order.orderNumber}`,
        },
      })

      productIds.add(restored.productId)
    }

    return [...productIds]
  })

  for (const productId of affectedProductIds) {
    await catalogService.syncProductAggregates(productId)
  }

  logger.warn({ orderNumber: payment.order.orderNumber, reason: params.reason }, 'payment failed')

  return { outcome: 'failed' }
}
