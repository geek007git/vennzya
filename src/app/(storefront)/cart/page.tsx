import type { Metadata } from 'next'
import { CartView } from '@/components/storefront/cart/cart-view'
import { Container } from '@/components/ui/primitives'

export const metadata: Metadata = {
  title: 'Your bag',
  robots: { index: false, follow: false },
}

export default function CartPage() {
  return (
    <Container className="py-10 md:py-14">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight md:text-4xl">Your bag</h1>
      <CartView />
    </Container>
  )
}
