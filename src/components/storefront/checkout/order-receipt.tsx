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

/** Static so the decorative grille never re-keys. */
const VENT_SLOTS = Array.from({ length: 26 }, (_, index) => `vent-${index}`)

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
      {/* The terminal. Purely decorative chrome — the paper below carries the data. */}
      <div
        aria-hidden
        className="pos-shell relative z-20 w-full rounded-[1.25rem] border border-white/8 px-4 pt-4 pb-3.5 shadow-[0_1px_0_rgb(255_255_255/0.06)_inset,0_22px_44px_-20px_rgb(20_16_13/0.75)] print:hidden"
      >
        {/* Moulded side grips. */}
        <span className="absolute inset-y-6 -left-px w-px rounded-full bg-linear-to-b from-transparent via-white/12 to-transparent" />
        <span className="absolute inset-y-6 -right-px w-px rounded-full bg-linear-to-b from-transparent via-white/12 to-transparent" />

        <div className="flex items-center justify-between">
          <span className="font-display text-[11px] font-semibold tracking-[0.3em] text-cream-100/90 uppercase">
            {siteConfig.shortName}
          </span>
          <span className="flex items-center gap-2 text-[10px] tracking-[0.14em] text-cream-200/55 uppercase">
            <span
              className={cn(
                'size-1.5 rounded-full',
                printed
                  ? 'bg-[color:var(--success)] shadow-[0_0_7px_1px_color-mix(in_oklab,var(--success)_75%,transparent)]'
                  : 'animate-pulse bg-amber-400 shadow-[0_0_7px_1px_rgb(251_191_36/0.7)] motion-reduce:animate-none',
              )}
            />
            {printed ? 'Ready' : 'Printing'}
          </span>
        </div>

        {/* Vent grille — the detail that reads as hardware rather than a card. */}
        <div className="mt-3.5 flex items-center gap-[3px]">
          {VENT_SLOTS.map((slot) => (
            <span
              className="h-2.5 flex-1 rounded-full bg-black/45 shadow-[0_1px_0_rgb(255_255_255/0.05)]"
              key={slot}
            />
          ))}
        </div>

        {/* Recessed paper slot the receipt feeds out of. */}
        <div className="mt-3.5 rounded-full bg-black/55 p-[3px] shadow-[0_1px_0_rgb(255_255_255/0.07)]">
          <div className="h-2 rounded-full bg-black shadow-[inset_0_2px_3px_rgb(0_0_0/0.95),inset_0_-1px_0_rgb(255_255_255/0.06)]" />
        </div>
      </div>

      {/* Feed window: the paper slides up from behind the printer body. */}
      <div className="-mt-2 w-[calc(100%-2rem)] overflow-hidden print:mt-0 print:w-full print:overflow-visible">
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
