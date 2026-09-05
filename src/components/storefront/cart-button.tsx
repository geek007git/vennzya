'use client'

import { ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { useCartItemCount } from '@/modules/cart/use-cart'

export function CartButton() {
  const count = useCartItemCount()

  return (
    <Link
      href="/cart"
      aria-label={count > 0 ? `Cart, ${count} item${count === 1 ? '' : 's'}` : 'Cart, empty'}
      className="relative inline-flex size-11 items-center justify-center rounded-md text-foreground transition-colors hover:bg-espresso-100"
    >
      <ShoppingBag className="size-5" aria-hidden />
      {count > 0 && (
        <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-espresso-800 px-1 text-[10px] font-semibold leading-4 text-cream-50">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
