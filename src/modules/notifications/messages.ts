import { render } from '@react-email/components'
import { createElement, type ReactElement } from 'react'
import {
  OrderConfirmedEmail,
  type OrderConfirmedEmailProps,
  type OrderEmailAddress,
} from './templates/order-confirmed'
import { OrderShippedEmail, type OrderShippedEmailProps } from './templates/order-shipped'

/**
 * Pure message building: order row in, `{ subject, html, text }` out. Kept
 * free of the database and the mail vendor so the wording and the maths can be
 * unit tested without either.
 */

export interface OrderEmailSource {
  id: string
  orderNumber: string
  guestAccessToken: string | null
  paymentMethod: 'RAZORPAY' | 'COD'
  contactEmail: string | null
  subtotal: number
  discountAmount: number
  shippingFee: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  totalAmount: number
  items: {
    id: string
    productNameSnapshot: string
    variantAttributesSnapshot: Record<string, string>
    quantity: number
    lineTotal: number
  }[]
  addresses: {
    kind: 'SHIPPING' | 'BILLING'
    fullName: string
    line1: string
    line2: string | null
    city: string
    state: string
    postalCode: string
  }[]
}

export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

export function orderUrl(order: Pick<OrderEmailSource, 'id' | 'guestAccessToken'>, appUrl: string) {
  const url = new URL(`/order-confirmation/${order.id}`, appUrl)
  // Guests have no session, so the confirmation page needs the one-off token
  // that checkout issued — without it the link 404s for them.
  if (order.guestAccessToken) url.searchParams.set('token', order.guestAccessToken)
  return url.toString()
}

export function shippingAddressOf(order: OrderEmailSource): OrderEmailAddress | null {
  const address = order.addresses.find((entry) => entry.kind === 'SHIPPING')
  if (!address) return null

  return {
    fullName: address.fullName,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
  }
}

export function orderConfirmedProps(
  order: OrderEmailSource,
  appUrl: string,
): OrderConfirmedEmailProps {
  return {
    orderNumber: order.orderNumber,
    orderUrl: orderUrl(order, appUrl),
    isCod: order.paymentMethod === 'COD',
    items: order.items.map((item) => ({
      id: item.id,
      name: item.productNameSnapshot,
      variantLabel:
        Object.entries(item.variantAttributesSnapshot)
          .map(([key, value]) => `${key} ${value}`)
          .join(' · ') || null,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    shippingFee: order.shippingFee,
    gstTotal: order.cgstAmount + order.sgstAmount + order.igstAmount,
    totalAmount: order.totalAmount,
    shippingAddress: shippingAddressOf(order),
  }
}

async function renderEmail(subject: string, element: ReactElement): Promise<RenderedEmail> {
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })])

  return { subject, html, text }
}

export function orderConfirmedEmail(
  order: OrderEmailSource,
  appUrl: string,
): Promise<RenderedEmail> {
  return renderEmail(
    `Order ${order.orderNumber} confirmed`,
    createElement(OrderConfirmedEmail, orderConfirmedProps(order, appUrl)),
  )
}

export function orderShippedEmail(
  order: OrderEmailSource,
  appUrl: string,
  tracking: Pick<OrderShippedEmailProps, 'courierName' | 'trackingNumber' | 'trackingUrl'>,
): Promise<RenderedEmail> {
  return renderEmail(
    `Order ${order.orderNumber} has shipped`,
    createElement(OrderShippedEmail, {
      ...tracking,
      orderNumber: order.orderNumber,
      orderUrl: orderUrl(order, appUrl),
      shippingAddress: shippingAddressOf(order),
    }),
  )
}
