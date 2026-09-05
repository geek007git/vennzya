import type { Metadata } from 'next'
import { CheckoutForm } from '@/components/storefront/checkout/checkout-form'
import { Container } from '@/components/ui/primitives'
import { isRazorpayConfigured } from '@/modules/payments/razorpay'

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
}

// Never cached: prices, stock and coupons are re-checked on every visit.
export const dynamic = 'force-dynamic'

export default function CheckoutPage() {
  return (
    <Container className="py-10 md:py-14">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight md:text-4xl">Checkout</h1>
      <CheckoutForm razorpayEnabled={isRazorpayConfigured()} />
    </Container>
  )
}
