'use client'

import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/primitives'
import { formatInrCompact } from '@/lib/format'
import { siteConfig } from '@/lib/site-config'
import { useCartStore } from '@/modules/cart/store'
import { useCartHydrated, useCartLines, useCartSubtotal } from '@/modules/cart/use-cart'

export function CartView() {
  const hydrated = useCartHydrated()
  const lines = useCartLines()
  const subtotal = useCartSubtotal()
  const setQuantity = useCartStore((state) => state.setQuantity)
  const removeLine = useCartStore((state) => state.removeLine)

  if (!hydrated) {
    return (
      <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          {[0, 1].map((key) => (
            <Skeleton key={key} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (lines.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-border py-20 text-center">
        <ShoppingBag className="mx-auto size-8 text-muted-foreground" aria-hidden />
        <h2 className="mt-4 text-lg font-semibold">Your bag is empty</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Once you find something you love, it will show up here.
        </p>
        <Button asChild className="mt-6">
          <Link href="/shop">Start shopping</Link>
        </Button>
      </div>
    )
  }

  const shortfall = siteConfig.freeShippingThreshold - subtotal

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
      <ul className="divide-y divide-border border-y border-border">
        {lines.map((line) => (
          <li key={line.variantId} className="flex gap-4 py-5">
            <Link
              href={`/products/${line.slug}`}
              className="relative size-24 shrink-0 overflow-hidden rounded-md bg-espresso-100 sm:size-28"
            >
              {line.imageUrl && (
                <Image src={line.imageUrl} alt={line.name} fill sizes="112px" className="object-cover" />
              )}
            </Link>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/products/${line.slug}`} className="text-sm font-medium hover:underline">
                    {line.name}
                  </Link>
                  {line.variantLabel && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{line.variantLabel}</p>
                  )}
                </div>
                <p className="shrink-0 text-sm font-semibold">
                  {formatInrCompact(line.unitPrice * line.quantity)}
                </p>
              </div>

              <div className="mt-auto flex items-center justify-between gap-3">
                <div className="flex items-center rounded-md border border-border">
                  <button
                    type="button"
                    onClick={() => setQuantity(line.variantId, line.quantity - 1)}
                    aria-label={`Decrease quantity of ${line.name}`}
                    className="flex size-10 items-center justify-center"
                  >
                    <Minus className="size-3.5" aria-hidden />
                  </button>
                  <span className="w-8 text-center text-sm">{line.quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                    disabled={line.quantity >= line.maxQuantity}
                    aria-label={`Increase quantity of ${line.name}`}
                    className="flex size-10 items-center justify-center disabled:opacity-40"
                  >
                    <Plus className="size-3.5" aria-hidden />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => removeLine(line.variantId)}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="lg:sticky lg:top-24 lg:h-fit">
        <div className="rounded-[var(--radius-card)] border border-border bg-card p-6">
          <h2 className="text-sm font-semibold">Order summary</h2>

          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatInrCompact(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd className="text-muted-foreground">Calculated at checkout</dd>
            </div>
          </dl>

          {shortfall > 0 ? (
            <p className="mt-4 rounded-md bg-espresso-50 px-3 py-2 text-xs text-muted-foreground">
              Add {formatInrCompact(shortfall)} more for free shipping.
            </p>
          ) : (
            <p className="mt-4 rounded-md bg-espresso-50 px-3 py-2 text-xs text-[color:var(--success)]">
              You’ve earned free shipping.
            </p>
          )}

          <Button asChild block size="lg" className="mt-5">
            <Link href="/checkout">
              Proceed to checkout
              <ArrowRight aria-hidden />
            </Link>
          </Button>

          <Button asChild variant="ghost" block className="mt-2">
            <Link href="/shop">Continue shopping</Link>
          </Button>

          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            Taxes are included in the price. Coupons can be applied at checkout.
          </p>
        </div>
      </aside>
    </div>
  )
}
