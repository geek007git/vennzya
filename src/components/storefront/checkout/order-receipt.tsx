'use client'

import { Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatDateTime, formatInrCompact } from '@/lib/format'
import { siteConfig } from '@/lib/site-config'
import { cn } from '@/lib/utils'

export interface OrderReceiptItem {
  id: string
  productNameSnapshot: string
  skuSnapshot: string | null
  variantAttributesSnapshot: Record<string, string>
  unitPrice: number
  quantity: number
  lineTotal: number
}

export interface OrderReceiptProps {
  className?: string
  order: {
    orderNumber: string
    placedAt: Date | string
    paymentMethod: 'RAZORPAY' | 'COD'
    paymentStatusLabel: string
    items: OrderReceiptItem[]
    subtotal: number
    discountAmount: number
    couponCodeSnapshot: string | null
    shippingFee: number
    cgstAmount: number
    sgstAmount: number
    igstAmount: number
    totalAmount: number
    contactEmail: string | null
    contactPhone: string
  }
}

const PAYMENT_METHOD_LABEL: Record<OrderReceiptProps['order']['paymentMethod'], string> = {
  RAZORPAY: 'Online (Razorpay)',
  COD: 'Cash on delivery',
}

/** Feed duration must match `--animate-receipt-feed` in globals.css. */
const FEED_MS = 1600

function Line({
  label,
  value,
  emphasis = false,
  testId,
  tone,
}: {
  label: string
  value: string
  emphasis?: boolean
  testId?: string
  tone?: 'success'
}) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-3',
        emphasis && 'text-[13px] font-semibold',
        tone === 'success' && 'text-[color:var(--success)]',
      )}
    >
      <span className={cn(!emphasis && 'text-espresso-600')}>{label}</span>
      <span className="tabular-nums" data-testid={testId}>
        {value}
      </span>
    </div>
  )
}

function Rule() {
  return <div aria-hidden className="my-3 border-t border-dashed border-espresso-300" />
}

/**
 * The order confirmation shown as a printed till receipt: the paper feeds out
 * of the machine once, then sits still. Everything inside is real order data,
 * so the same markup is what `window.print()` puts on paper.
 */
export function OrderReceipt({ className, order }: OrderReceiptProps) {
  const [printed, setPrinted] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setPrinted(true), FEED_MS)
    return () => window.clearTimeout(timer)
  }, [])

  const gstTotal = order.cgstAmount + order.sgstAmount + order.igstAmount
  const itemCount = order.items.reduce((total, item) => total + item.quantity, 0)

  return (
    <section
      aria-label="Order receipt"
      className={cn('receipt mx-auto flex w-full max-w-sm flex-col items-center', className)}
    >
      {/* Printer body. Purely decorative chrome — the receipt below carries the data. */}
      <div
        aria-hidden
        className="relative z-20 w-full rounded-[var(--radius-card)] border border-espresso-300 bg-linear-to-b from-cream-50 to-espresso-100 p-3 shadow-[var(--shadow-card)] print:hidden"
      >
        <div className="flex items-center justify-between px-1 pb-3">
          <span className="font-display text-sm font-semibold tracking-tight text-espresso-900">
            {siteConfig.shortName}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-espresso-600">
            <span
              className={cn(
                'size-1.5 rounded-full',
                printed
                  ? 'bg-[color:var(--success)]'
                  : 'animate-pulse bg-espresso-500 motion-reduce:animate-none',
              )}
            />
            {printed ? 'Receipt printed' : 'Printing receipt'}
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-espresso-900 shadow-[inset_0_1px_2px_rgb(255_255_255/0.25)]" />
      </div>

      {/* Feed window: the paper slides up from behind the printer body. */}
      <div className="-mt-1.5 w-[calc(100%-1.5rem)] overflow-hidden print:mt-0 print:w-full print:overflow-visible">
        <article
          className="receipt-paper animate-receipt-feed bg-white px-5 pt-6 pb-8 font-mono text-[12px] leading-relaxed text-espresso-950 shadow-[var(--shadow-card)] motion-reduce:animate-none print:animate-none print:shadow-none"
          data-testid="order-receipt"
        >
          <header className="text-center">
            <h2 className="font-mono text-[13px] font-semibold tracking-[0.2em] uppercase">
              {siteConfig.name}
            </h2>
            <p className="mt-1 text-[11px] text-espresso-600">{siteConfig.tagline}</p>
            <p className="mt-0.5 text-[11px] text-espresso-600">{siteConfig.email}</p>
          </header>

          <Rule />

          <div className="space-y-1 text-[11px]">
            <Line label="Order" value={order.orderNumber} />
            <Line label="Placed" value={formatDateTime(order.placedAt)} />
            <Line label="Payment" value={PAYMENT_METHOD_LABEL[order.paymentMethod]} />
            <Line label="Status" value={order.paymentStatusLabel} />
          </div>

          <Rule />

          <ul className="space-y-3">
            {order.items.map((item) => {
              const variants = Object.entries(item.variantAttributesSnapshot)
                .map(([key, value]) => `${key} ${value}`)
                .join(' · ')

              return (
                <li key={item.id}>
                  <p className="font-medium uppercase">{item.productNameSnapshot}</p>
                  {(variants || item.skuSnapshot) && (
                    <p className="text-[11px] text-espresso-600">
                      {[variants, item.skuSnapshot].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <Line
                    label={`${item.quantity} × ${formatInrCompact(item.unitPrice)}`}
                    value={formatInrCompact(item.lineTotal)}
                  />
                </li>
              )
            })}
          </ul>

          <Rule />

          <div className="space-y-1">
            <Line
              label={`Subtotal (${itemCount} item${itemCount === 1 ? '' : 's'})`}
              value={formatInrCompact(order.subtotal)}
            />
            {order.discountAmount > 0 && (
              <Line
                label={`Discount${order.couponCodeSnapshot ? ` · ${order.couponCodeSnapshot}` : ''}`}
                tone="success"
                value={`−${formatInrCompact(order.discountAmount)}`}
              />
            )}
            <Line
              label="Shipping"
              value={order.shippingFee === 0 ? 'FREE' : formatInrCompact(order.shippingFee)}
            />
            <Line
              label={order.igstAmount > 0 ? 'IGST' : 'CGST + SGST'}
              value={formatInrCompact(gstTotal)}
            />
          </div>

          <Rule />

          <Line
            emphasis
            label="TOTAL"
            testId="order-total"
            value={formatInrCompact(order.totalAmount)}
          />

          <Rule />

          <footer className="space-y-1 text-center text-[11px] text-espresso-600">
            <p>{order.contactEmail ?? order.contactPhone}</p>
            <p>Returns accepted within {siteConfig.returnWindowDays} days of delivery.</p>
            <p className="pt-2 tracking-[0.2em] uppercase">Thank you for shopping</p>
          </footer>
        </article>
      </div>

      <Button
        className="mt-6 print:hidden"
        onClick={() => window.print()}
        size="sm"
        variant="outline"
      >
        <Printer className="size-4" aria-hidden />
        Print receipt
      </Button>
    </section>
  )
}
