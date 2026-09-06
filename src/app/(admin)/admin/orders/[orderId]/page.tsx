import { ExternalLink, MapPin, Package, Receipt, StickyNote, Truck, User } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { AdminCard, AdminPageHeader, StatusBadge } from '@/components/admin/kit'
import { OrderActions } from '@/components/admin/orders/order-actions'
import { formatDate, formatDateTime, formatInr } from '@/lib/format'
import { formatPhone } from '@/lib/india'
import { trpc } from '@/trpc/server'

export const metadata: Metadata = {
  title: 'Order',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

function isForbidden(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'FORBIDDEN'
  )
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'NOT_FOUND'
  )
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const { orderId } = await params

  let order: Awaited<ReturnType<typeof trpc.orders.adminById>> | null = null
  let forbidden = false

  try {
    order = await trpc.orders.adminById({ orderId })
  } catch (error) {
    if (isForbidden(error)) forbidden = true
    else if (isNotFound(error)) notFound()
    else throw error
  }

  if (forbidden) {
    return (
      <>
        <AdminPageHeader title="Order" backHref={{ href: '/admin/orders', label: 'All orders' }} />
        <AdminCard title="No access">
          <p className="text-sm text-muted-foreground">
            You don’t have permission to view orders. Ask the owner to grant you order access.
          </p>
        </AdminCard>
      </>
    )
  }

  if (!order) notFound()

  const shipping = order.addresses.find((address) => address.kind === 'SHIPPING')
  const billing = order.addresses.find((address) => address.kind === 'BILLING')
  const gstTotal = order.cgstAmount + order.sgstAmount + order.igstAmount
  const isInterState = order.igstAmount > 0

  return (
    <>
      <AdminPageHeader
        title={order.orderNumber}
        description={`Placed ${formatDateTime(order.placedAt)}${
          order.confirmedAt ? ` · confirmed ${formatDate(order.confirmedAt)}` : ''
        }`}
        backHref={{ href: '/admin/orders', label: 'All orders' }}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={order.status} />
            <StatusBadge
              status={order.paymentStatus}
              label={`${order.paymentMethod === 'COD' ? 'COD' : 'Online'} · ${order.paymentStatus
                .toLowerCase()
                .replace(/_/g, ' ')}`}
            />
            <StatusBadge status={order.shippingStatus} />
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="space-y-4">
          <AdminCard title="Items" description={`${order.items.length} in this order`}>
            <ul className="divide-y divide-border">
              {order.items.map((item) => {
                const attributes = Object.entries(item.variantAttributesSnapshot)
                  .map(([key, value]) => `${key} ${value}`)
                  .join(' · ')

                return (
                  <li key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
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
                      <p className="text-sm font-medium">{item.productNameSnapshot}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {attributes ? `${attributes} · ` : ''}SKU {item.skuSnapshot}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatInr(item.unitPrice)} × {item.quantity}
                      </p>
                    </div>

                    <p className="shrink-0 text-sm font-medium">{formatInr(item.lineTotal)}</p>
                  </li>
                )
              })}
            </ul>

            <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{formatInr(order.subtotal)}</dd>
              </div>

              {order.discountAmount > 0 && (
                <div className="flex justify-between text-[color:var(--success)]">
                  <dt>
                    Discount
                    {order.couponCodeSnapshot ? ` (${order.couponCodeSnapshot})` : ''}
                  </dt>
                  <dd>−{formatInr(order.discountAmount)}</dd>
                </div>
              )}

              <div className="flex justify-between">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd>{order.shippingFee === 0 ? 'Free' : formatInr(order.shippingFee)}</dd>
              </div>

              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd>{formatInr(order.totalAmount)}</dd>
              </div>

              <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                <Receipt className="size-3.5" aria-hidden />
                Inclusive of GST {formatInr(gstTotal)}
                {isInterState
                  ? ` (IGST ${formatInr(order.igstAmount)})`
                  : ` (CGST ${formatInr(order.cgstAmount)} + SGST ${formatInr(order.sgstAmount)})`}
              </p>
            </dl>
          </AdminCard>

          {order.tracking.length > 0 && (
            <AdminCard title="Tracking">
              <ul className="space-y-3">
                {order.tracking.map((entry) => (
                  <li
                    key={`${entry.courierName}-${entry.trackingNumber}`}
                    className="flex items-start gap-3"
                  >
                    <Truck className="mt-0.5 size-4 shrink-0 text-espresso-500" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {entry.courierName} · {entry.trackingNumber}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {entry.shippedAt
                          ? `Shipped ${formatDate(entry.shippedAt)}`
                          : 'Not yet shipped'}
                        {entry.estimatedDeliveryAt
                          ? ` · due ${formatDate(entry.estimatedDeliveryAt)}`
                          : ''}
                        {entry.deliveredAt ? ` · delivered ${formatDate(entry.deliveredAt)}` : ''}
                      </p>
                      {entry.trackingUrl && (
                        <a
                          href={entry.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs underline underline-offset-4"
                        >
                          Track shipment
                          <ExternalLink className="size-3" aria-hidden />
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </AdminCard>
          )}

          {order.customerNote && (
            <AdminCard title="Note from the customer">
              <p className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                <StickyNote className="mt-0.5 size-4 shrink-0" aria-hidden />
                {order.customerNote}
              </p>
            </AdminCard>
          )}

          <AdminCard title="Customer">
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <User className="mt-0.5 size-4 shrink-0 text-espresso-500" aria-hidden />
                <div>
                  <p className="font-medium">{order.customer?.name ?? 'Guest'}</p>
                  <p className="text-muted-foreground">{formatPhone(order.contactPhone)}</p>
                  {order.contactEmail && (
                    <p className="text-muted-foreground">{order.contactEmail}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
                {shipping && (
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-espresso-500" aria-hidden />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Delivery address
                      </p>
                      <address className="mt-1 not-italic leading-relaxed text-muted-foreground">
                        <span className="block font-medium text-foreground">
                          {shipping.fullName}
                        </span>
                        {shipping.line1}
                        {shipping.line2 && <>, {shipping.line2}</>}
                        {shipping.landmark && <>, {shipping.landmark}</>}
                        <br />
                        {shipping.city}, {shipping.state} {shipping.postalCode}
                        <br />
                        {formatPhone(shipping.phone)}
                      </address>
                    </div>
                  </div>
                )}

                {billing && (
                  <div className="flex items-start gap-3">
                    <Package className="mt-0.5 size-4 shrink-0 text-espresso-500" aria-hidden />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Billing address
                      </p>
                      <address className="mt-1 not-italic leading-relaxed text-muted-foreground">
                        <span className="block font-medium text-foreground">
                          {billing.fullName}
                        </span>
                        {billing.line1}
                        {billing.line2 && <>, {billing.line2}</>}
                        <br />
                        {billing.city}, {billing.state} {billing.postalCode}
                      </address>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </AdminCard>
        </div>

        <OrderActions
          orderId={order.id}
          orderNumber={order.orderNumber}
          status={order.status}
          shippingStatus={order.shippingStatus}
          paymentMethod={order.paymentMethod}
          paymentStatus={order.paymentStatus}
          totalAmount={order.totalAmount}
          adminNote={order.adminNote}
          customerPhone={order.contactPhone}
          customerName={order.customer?.name ?? 'there'}
        />
      </div>
    </>
  )
}
