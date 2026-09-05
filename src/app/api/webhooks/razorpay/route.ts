import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { verifyWebhookSignature } from '@/modules/payments/razorpay'
import { confirmPayment, failPayment } from '@/modules/payments/service'
import { db } from '@/server/db'

// Signature verification needs the exact bytes Razorpay signed, so this route
// must never let a framework parse the body first.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface RazorpayWebhookBody {
  event: string
  payload?: {
    payment?: {
      entity?: {
        id?: string
        order_id?: string
        method?: string
        error_description?: string
      }
    }
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-razorpay-signature')

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    logger.warn('razorpay webhook: invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let body: RazorpayWebhookBody
  try {
    body = JSON.parse(rawBody) as RazorpayWebhookBody
  } catch {
    return NextResponse.json({ error: 'Malformed payload' }, { status: 400 })
  }

  const entity = body.payload?.payment?.entity
  const razorpayOrderId = entity?.order_id
  const razorpayPaymentId = entity?.id

  // Razorpay retries on any non-2xx, so the event id is recorded first and a
  // duplicate delivery is acknowledged without reprocessing.
  const eventId = request.headers.get('x-razorpay-event-id') ?? `${body.event}:${razorpayPaymentId}`

  const existing = await db.webhookEvent.findUnique({
    where: { providerEventId: eventId },
    select: { id: true, processedAt: true },
  })

  if (existing?.processedAt) {
    return NextResponse.json({ status: 'duplicate' })
  }

  const event = existing
    ? { id: existing.id }
    : await db.webhookEvent.create({
        data: {
          provider: 'RAZORPAY',
          eventType: body.event,
          providerEventId: eventId,
          payload: JSON.parse(rawBody) as object,
        },
        select: { id: true },
      })

  try {
    if (!razorpayOrderId) {
      logger.info({ event: body.event }, 'razorpay webhook: no order id, ignoring')
    } else if (body.event === 'payment.captured' || body.event === 'order.paid') {
      await confirmPayment({
        razorpayOrderId,
        razorpayPaymentId: razorpayPaymentId ?? 'unknown',
        ...(entity?.method ? { method: entity.method } : {}),
        rawPayload: JSON.parse(rawBody) as object,
      })
    } else if (body.event === 'payment.failed') {
      await failPayment({
        razorpayOrderId,
        ...(entity?.error_description ? { reason: entity.error_description } : {}),
        rawPayload: JSON.parse(rawBody) as object,
      })
    }

    await db.webhookEvent.update({
      where: { id: event.id },
      data: { processedAt: new Date() },
    })

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    logger.error({ err: error, event: body.event }, 'razorpay webhook processing failed')

    await db.webhookEvent.update({
      where: { id: event.id },
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
    })

    // 500 asks Razorpay to retry — the event stays unprocessed on purpose.
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
