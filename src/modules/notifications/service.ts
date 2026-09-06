import 'server-only'

import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import { toNumber } from '@/lib/money'
import { db } from '@/server/db'
import { emailChannel } from './channels/email'
import { type OrderEmailSource, orderConfirmedEmail, orderShippedEmail } from './messages'

/**
 * Transactional email.
 *
 * Every entry point is best-effort: a mail vendor being down must never fail
 * an order that has already been paid for, so failures are logged and
 * swallowed. Delivery is retried by moving these calls onto the job queue,
 * not by throwing at the shopper.
 */

const orderEmailSelect = {
  id: true,
  orderNumber: true,
  guestAccessToken: true,
  paymentMethod: true,
  contactEmail: true,
  subtotal: true,
  discountAmount: true,
  shippingFee: true,
  cgstAmount: true,
  sgstAmount: true,
  igstAmount: true,
  totalAmount: true,
  items: {
    select: {
      id: true,
      productNameSnapshot: true,
      variantAttributesSnapshot: true,
      quantity: true,
      lineTotal: true,
    },
  },
  addresses: {
    select: {
      kind: true,
      fullName: true,
      line1: true,
      line2: true,
      city: true,
      state: true,
      postalCode: true,
    },
  },
} as const

async function loadOrder(orderId: string): Promise<OrderEmailSource | null> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: orderEmailSelect,
  })

  if (!order) return null

  return {
    ...order,
    subtotal: toNumber(order.subtotal.toString()),
    discountAmount: toNumber(order.discountAmount.toString()),
    shippingFee: toNumber(order.shippingFee.toString()),
    cgstAmount: toNumber(order.cgstAmount.toString()),
    sgstAmount: toNumber(order.sgstAmount.toString()),
    igstAmount: toNumber(order.igstAmount.toString()),
    totalAmount: toNumber(order.totalAmount.toString()),
    items: order.items.map((item) => ({
      ...item,
      lineTotal: toNumber(item.lineTotal.toString()),
      variantAttributesSnapshot: item.variantAttributesSnapshot as Record<string, string>,
    })),
  }
}

async function deliver(
  orderId: string,
  kind: string,
  build: (order: OrderEmailSource) => Promise<{ subject: string; html: string; text: string }>,
) {
  try {
    const order = await loadOrder(orderId)

    if (!order) {
      logger.warn({ orderId, kind }, 'order email skipped: order not found')
      return
    }

    // Phone-only checkout is normal here — there is simply nowhere to send.
    if (!order.contactEmail) {
      logger.info({ orderId, kind }, 'order email skipped: no email on the order')
      return
    }

    const message = await build(order)

    await emailChannel.send({ to: order.contactEmail, ...message })

    logger.info(
      { orderNumber: order.orderNumber, kind, channel: emailChannel.name },
      'order email sent',
    )
  } catch (error) {
    logger.error({ orderId, kind, err: error }, 'order email failed')
  }
}

export const notifications = {
  /** Sent once an order is payable-and-placed: COD immediately, online on capture. */
  async orderConfirmed(orderId: string) {
    await deliver(orderId, 'order-confirmed', (order) =>
      orderConfirmedEmail(order, env.NEXT_PUBLIC_APP_URL),
    )
  },

  /** Sent when admin attaches tracking to the order. */
  async orderShipped(
    orderId: string,
    tracking: { courierName: string; trackingNumber: string; trackingUrl: string | null },
  ) {
    await deliver(orderId, 'order-shipped', (order) =>
      orderShippedEmail(order, env.NEXT_PUBLIC_APP_URL, tracking),
    )
  },
}
