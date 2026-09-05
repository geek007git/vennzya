import { CheckCircle2, Clock, Package, Truck } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { WhatsAppIcon } from '@/components/ui/brand-icons'
import { Button } from '@/components/ui/button'
import { Badge, Container } from '@/components/ui/primitives'
import { formatInrCompact } from '@/lib/format'
import { formatPhone } from '@/lib/india'
import { siteConfig, whatsappLink } from '@/lib/site-config'
import { trpc } from '@/trpc/server'

export const metadata: Metadata = {
  title: 'Order confirmed',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ orderId: string }>
  searchParams: Promise<{ token?: string }>
}

const PAYMENT_LABEL: Record<string, string> = {
  PENDING: 'Awaiting payment',
  PAID: 'Paid',
  FAILED: 'Payment failed',
  REFUNDED: 'Refunded',
  PARTIALLY_REFUNDED: 'Partially refunded',
  COD_PENDING: 'Pay on delivery',
  COD_COLLECTED: 'Paid on delivery',
}

export default async function OrderConfirmationPage({ params, searchParams }: PageProps) {
  const [{ orderId }, { token }] = await Promise.all([params, searchParams])

  const order = await trpc.orders
    .byId({ orderId, ...(token ? { token } : {}) })
    .catch(() => null)

  if (!order) notFound()

  const shipping = order.addresses.find((address) => address.kind === 'SHIPPING')
  const isPaid = order.paymentStatus === 'PAID' || order.paymentStatus === 'COD_COLLECTED'
  const awaitingPayment = order.paymentStatus === 'PENDING'
  const gstTotal = order.cgstAmount + order.sgstAmount + order.igstAmount

  return (
    <Container className="py-12 md:py-16">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          {awaitingPayment ? (
            <Clock className="mx-auto size-12 text-espresso-500" aria-hidden />
          ) : (
            <CheckCircle2 className="mx-auto size-12 text-[color:var(--success)]" aria-hidden />
          )}

          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            {awaitingPayment ? 'We’re confirming your payment' : 'Thank you for your order'}
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            {awaitingPayment
              ? 'This page will show the final status once your bank confirms the payment. It usually takes under a minute.'
              : `We’ve received your order and will start preparing it. A confirmation has been sent to ${
                  order.contactEmail ?? formatPhone(order.contactPhone)
                }.`}
          </p>

          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm">
            <span className="text-muted-foreground">Order</span>
            <span className="font-semibold" data-testid="order-number">
              {order.orderNumber}
            </span>
            <Badge variant={isPaid ? 'success' : 'neutral'}>
              {PAYMENT_LABEL[order.paymentStatus] ?? order.paymentStatus}
            </Badge>
          </p>
        </div>

        <section className="mt-10 rounded-[var(--radius-card)] border border-border bg-card p-6">
          <h2 className="text-sm font-semibold">Your items</h2>

          <ul className="mt-4 divide-y divide-border">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-4 py-4">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-espresso-100">
                  {item.imageUrlSnapshot && (
                    <Image
                      src={item.imageUrlSnapshot}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/products/${item.productSlugSnapshot}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {item.productNameSnapshot}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {Object.entries(item.variantAttributesSnapshot)
                      .map(([key, value]) => `${key} ${value}`)
                      .join(' · ')}
                    {' · '}
                    Qty {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-medium">{formatInrCompact(item.lineTotal)}</p>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatInrCompact(order.subtotal)}</dd>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-[color:var(--success)]">
                <dt>Discount {order.couponCodeSnapshot && `(${order.couponCodeSnapshot})`}</dt>
                <dd>−{formatInrCompact(order.discountAmount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd>{order.shippingFee === 0 ? 'Free' : formatInrCompact(order.shippingFee)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd data-testid="order-total">{formatInrCompact(order.totalAmount)}</dd>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Includes GST {formatInrCompact(gstTotal)}
              {order.igstAmount > 0 ? ' (IGST)' : ' (CGST + SGST)'}
            </p>
          </dl>
        </section>

        {shipping && (
          <section className="mt-6 grid gap-6 rounded-[var(--radius-card)] border border-border bg-card p-6 sm:grid-cols-2">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Truck className="size-4" aria-hidden />
                Delivering to
              </h2>
              <address className="mt-3 text-sm not-italic leading-relaxed text-muted-foreground">
                <span className="block font-medium text-foreground">{shipping.fullName}</span>
                {shipping.line1}
                {shipping.line2 && <>, {shipping.line2}</>}
                <br />
                {shipping.city}, {shipping.state} {shipping.postalCode}
                <br />
                {formatPhone(shipping.phone)}
              </address>
            </div>

            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Package className="size-4" aria-hidden />
                What happens next
              </h2>
              <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>We pack your order within 1–2 business days.</li>
                <li>You’ll get a tracking link as soon as it ships.</li>
                <li>Delivery usually takes 3–7 business days.</li>
              </ol>
            </div>
          </section>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="outline">
            <Link href="/shop">Continue shopping</Link>
          </Button>
          <Button asChild variant="whatsapp">
            <a
              href={whatsappLink(
                `Hi ${siteConfig.shortName}, I have a question about order ${order.orderNumber}.`,
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              <WhatsAppIcon className="size-4" />
              Ask about this order
            </a>
          </Button>
        </div>
      </div>
    </Container>
  )
}
