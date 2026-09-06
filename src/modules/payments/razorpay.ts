import { createHmac, timingSafeEqual } from 'node:crypto'
import Razorpay from 'razorpay'
import { env } from '@/lib/env'
import { integrations } from '@/lib/integrations'
import { logger } from '@/lib/logger'

/**
 * Razorpay is optional in development: without keys the storefront still works
 * end-to-end on Cash on Delivery, and online payment surfaces a clear error
 * rather than a crash.
 */

let client: Razorpay | null = null

export function razorpayClient(): Razorpay {
  if (!integrations.razorpay) {
    throw new Error(
      'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to accept online payments.',
    )
  }

  client ??= new Razorpay({
    key_id: env.RAZORPAY_KEY_ID as string,
    key_secret: env.RAZORPAY_KEY_SECRET as string,
  })

  return client
}

export const isRazorpayConfigured = () => integrations.razorpay

export interface CreatedRazorpayOrder {
  razorpayOrderId: string
  amountInPaise: number
  currency: string
  keyId: string
}

export async function createRazorpayOrder(params: {
  amountInPaise: number
  receipt: string
  notes: Record<string, string>
}): Promise<CreatedRazorpayOrder> {
  const order = await razorpayClient().orders.create({
    amount: params.amountInPaise,
    currency: 'INR',
    receipt: params.receipt,
    notes: params.notes,
    payment_capture: true,
  })

  return {
    razorpayOrderId: order.id,
    amountInPaise: Number(order.amount),
    currency: order.currency,
    keyId: env.RAZORPAY_KEY_ID as string,
  }
}

function safeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8')
  const bufferB = Buffer.from(b, 'utf8')
  if (bufferA.length !== bufferB.length) return false
  return timingSafeEqual(bufferA, bufferB)
}

/** Verifies the signature Razorpay Checkout hands back to the browser. */
export function verifyPaymentSignature(params: {
  razorpayOrderId: string
  razorpayPaymentId: string
  signature: string
}): boolean {
  if (!env.RAZORPAY_KEY_SECRET) return false

  const expected = createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
    .digest('hex')

  return safeEquals(expected, params.signature)
}

/** Verifies a webhook body. Must be given the raw, unparsed request body. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    logger.error('RAZORPAY_WEBHOOK_SECRET is not set — refusing to trust webhook')
    return false
  }

  const expected = createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex')

  return safeEquals(expected, signature)
}

export async function refundPayment(params: {
  razorpayPaymentId: string
  amountInPaise: number
  notes?: Record<string, string>
}) {
  return razorpayClient().payments.refund(params.razorpayPaymentId, {
    amount: params.amountInPaise,
    speed: 'normal',
    ...(params.notes ? { notes: params.notes } : {}),
  })
}
