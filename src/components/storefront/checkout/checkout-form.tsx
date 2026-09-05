'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Lock, ShieldCheck, Tag } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Badge, Skeleton } from '@/components/ui/primitives'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatInrCompact } from '@/lib/format'
import { INDIAN_STATES } from '@/lib/india'
import { loadRazorpayScript, openRazorpayCheckout } from '@/lib/razorpay-checkout'
import { siteConfig } from '@/lib/site-config'
import { useCartStore } from '@/modules/cart/store'
import { useCartHydrated, useCartLines } from '@/modules/cart/use-cart'
import { addressInput } from '@/modules/checkout/schema'
import { api } from '@/trpc/react'

const formSchema = addressInput.extend({
  email: z.string().trim().email('Enter a valid email').or(z.literal('')).optional(),
  customerNote: z.string().trim().max(500).optional(),
})

type FormValues = z.input<typeof formSchema>

export function CheckoutForm({ razorpayEnabled }: { razorpayEnabled: boolean }) {
  const router = useRouter()
  const hydrated = useCartHydrated()
  const lines = useCartLines()
  const clearCart = useCartStore((state) => state.clear)

  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<string | undefined>(undefined)
  const [paymentMethod, setPaymentMethod] = useState<'RAZORPAY' | 'COD'>(
    razorpayEnabled ? 'RAZORPAY' : 'COD',
  )
  const [isPaying, setIsPaying] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { country: 'IN' },
  })

  const selectedState = watch('state')

  const items = useMemo(
    () => lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
    [lines],
  )

  const quote = api.checkout.quote.useQuery(
    {
      items,
      ...(appliedCoupon ? { couponCode: appliedCoupon } : {}),
      ...(selectedState ? { state: selectedState } : {}),
    },
    { enabled: hydrated && items.length > 0 },
  )

  const placeOrder = api.checkout.placeOrder.useMutation()
  const verifyPayment = api.checkout.verifyPayment.useMutation()

  // Stock can move between adding to the bag and paying; the server-side quote
  // is the source of truth, so surface any correction it made.
  useEffect(() => {
    for (const message of quote.data?.adjustments ?? []) toast.warning(message)
  }, [quote.data?.adjustments])

  useEffect(() => {
    if (quote.data?.couponError) {
      toast.error(quote.data.couponError)
      setAppliedCoupon(undefined)
    }
  }, [quote.data?.couponError])

  useEffect(() => {
    if (hydrated && lines.length === 0 && !isPaying) router.replace('/cart')
  }, [hydrated, lines.length, isPaying, router])

  async function onSubmit(values: FormValues) {
    if (items.length === 0) return
    setIsPaying(true)

    try {
      const result = await placeOrder.mutateAsync({
        items,
        ...(values.email ? { email: values.email } : {}),
        shippingAddress: {
          fullName: values.fullName,
          phone: values.phone,
          line1: values.line1,
          ...(values.line2 ? { line2: values.line2 } : {}),
          ...(values.landmark ? { landmark: values.landmark } : {}),
          city: values.city,
          state: values.state,
          postalCode: values.postalCode,
          country: 'IN',
        },
        billingSameAsShipping: true,
        ...(appliedCoupon ? { couponCode: appliedCoupon } : {}),
        paymentMethod,
        ...(values.customerNote ? { customerNote: values.customerNote } : {}),
      })

      if (paymentMethod === 'COD' || !result.razorpay) {
        clearCart()
        router.push(`/order-confirmation/${result.orderId}?token=${result.guestAccessToken}`)
        return
      }

      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        toast.error('Could not reach the payment gateway', {
          description: 'Check your connection, or choose Cash on Delivery.',
        })
        setIsPaying(false)
        return
      }

      const opened = openRazorpayCheckout({
        key: result.razorpay.keyId,
        amount: result.razorpay.amountInPaise,
        currency: result.razorpay.currency,
        name: siteConfig.name,
        description: `Order ${result.orderNumber}`,
        order_id: result.razorpay.razorpayOrderId,
        prefill: {
          name: values.fullName,
          ...(values.email ? { email: values.email } : {}),
          contact: values.phone,
        },
        notes: { orderNumber: result.orderNumber },
        theme: { color: '#4a3728' },
        handler: async (response) => {
          try {
            await verifyPayment.mutateAsync({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            clearCart()
            router.push(`/order-confirmation/${result.orderId}?token=${result.guestAccessToken}`)
          } catch {
            // The webhook still settles the order, so send them to the
            // confirmation page rather than implying the payment was lost.
            clearCart()
            router.push(`/order-confirmation/${result.orderId}?token=${result.guestAccessToken}`)
          }
        },
        modal: {
          ondismiss: () => {
            setIsPaying(false)
            toast.info('Payment cancelled', {
              description: 'Your bag is safe — you can try again whenever you like.',
            })
          },
        },
      })

      if (!opened) {
        toast.error('Payment could not start. Please try again.')
        setIsPaying(false)
      }
    } catch (error) {
      setIsPaying(false)
      toast.error('We could not place your order', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    }
  }

  if (!hydrated) return <Skeleton className="h-96 w-full" />

  const summary = quote.data

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-10 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-10">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Contact</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="fullName" required error={errors.fullName?.message}>
              <Input id="fullName" autoComplete="name" {...register('fullName')} />
            </Field>
            <Field
              label="Mobile number"
              htmlFor="phone"
              required
              hint="We’ll send order updates here"
              error={errors.phone?.message}
            >
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="98765 43210"
                {...register('phone')}
              />
            </Field>
          </div>
          <Field
            label="Email"
            htmlFor="email"
            hint="Optional — for your receipt"
            error={errors.email?.message}
          >
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
          </Field>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Delivery address</h2>

          <Field label="Address" htmlFor="line1" required error={errors.line1?.message}>
            <Input
              id="line1"
              autoComplete="address-line1"
              placeholder="House / flat number, street"
              {...register('line1')}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Area / locality" htmlFor="line2" error={errors.line2?.message}>
              <Input id="line2" autoComplete="address-line2" {...register('line2')} />
            </Field>
            <Field label="Landmark" htmlFor="landmark" error={errors.landmark?.message}>
              <Input id="landmark" {...register('landmark')} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="PIN code" htmlFor="postalCode" required error={errors.postalCode?.message}>
              <Input
                id="postalCode"
                inputMode="numeric"
                maxLength={6}
                autoComplete="postal-code"
                {...register('postalCode')}
              />
            </Field>
            <Field label="City" htmlFor="city" required error={errors.city?.message}>
              <Input id="city" autoComplete="address-level2" {...register('city')} />
            </Field>
            <Field label="State" htmlFor="state" required error={errors.state?.message}>
              <Select
                value={selectedState ?? ''}
                onValueChange={(value) =>
                  setValue('state', value as FormValues['state'], { shouldValidate: true })
                }
              >
                <SelectTrigger id="state">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Delivery notes" htmlFor="customerNote" error={errors.customerNote?.message}>
            <Textarea
              id="customerNote"
              rows={3}
              placeholder="Anything we should know about delivery?"
              {...register('customerNote')}
            />
          </Field>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Payment</h2>

          <RadioGroup
            value={paymentMethod}
            onValueChange={(value) => setPaymentMethod(value as 'RAZORPAY' | 'COD')}
            className="space-y-3"
          >
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-card)] border p-4 transition-colors ${
                paymentMethod === 'RAZORPAY' ? 'border-espresso-800 bg-espresso-50' : 'border-border'
              } ${razorpayEnabled ? '' : 'cursor-not-allowed opacity-50'}`}
            >
              <RadioGroupItem value="RAZORPAY" disabled={!razorpayEnabled} className="mt-1" />
              <span className="flex-1">
                <span className="flex items-center gap-2 text-sm font-medium">
                  Pay online
                  <Badge variant="outline">UPI · Cards · Netbanking</Badge>
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {razorpayEnabled
                    ? 'Secure payment via Razorpay. Your card details never reach our servers.'
                    : 'Online payment is not configured yet.'}
                </span>
              </span>
            </label>

            <label
              className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-card)] border p-4 transition-colors ${
                paymentMethod === 'COD' ? 'border-espresso-800 bg-espresso-50' : 'border-border'
              }`}
            >
              <RadioGroupItem value="COD" className="mt-1" />
              <span className="flex-1">
                <span className="text-sm font-medium">Cash on delivery</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Pay the courier when your order arrives.
                </span>
              </span>
            </label>
          </RadioGroup>
        </section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:h-fit">
        <div className="rounded-[var(--radius-card)] border border-border bg-card p-6">
          <h2 className="text-sm font-semibold">Order summary</h2>

          <ul className="mt-4 space-y-3">
            {lines.map((line) => (
              <li key={line.variantId} className="flex gap-3">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-espresso-100">
                  {line.imageUrl && (
                    <Image src={line.imageUrl} alt="" fill sizes="56px" className="object-cover" />
                  )}
                  <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-espresso-800 text-[10px] text-cream-50">
                    {line.quantity}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{line.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{line.variantLabel}</p>
                </div>
                <p className="text-xs font-medium">
                  {formatInrCompact(line.unitPrice * line.quantity)}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex gap-2">
            <Input
              value={couponInput}
              onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
              placeholder="Coupon code"
              aria-label="Coupon code"
              className="h-10"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAppliedCoupon(couponInput.trim() || undefined)}
              disabled={!couponInput.trim() || quote.isFetching}
            >
              Apply
            </Button>
          </div>

          {summary?.coupon && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-[color:var(--success)]">
              <Tag className="size-3.5" aria-hidden />
              {summary.coupon.code} — {summary.coupon.message}
            </p>
          )}

          <dl className="mt-5 space-y-2.5 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{summary ? formatInrCompact(summary.subtotal) : '—'}</dd>
            </div>
            {summary && summary.discountAmount > 0 && (
              <div className="flex justify-between text-[color:var(--success)]">
                <dt>Discount</dt>
                <dd>−{formatInrCompact(summary.discountAmount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd>
                {summary
                  ? summary.shippingFee === 0
                    ? 'Free'
                    : formatInrCompact(summary.shippingFee)
                  : '—'}
              </dd>
            </div>
            <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
              <dt>Total</dt>
              <dd data-testid="order-total">
                {summary ? formatInrCompact(summary.totalAmount) : '—'}
              </dd>
            </div>
            {summary && (
              <p className="text-[11px] text-muted-foreground">
                Includes GST{' '}
                {formatInrCompact(summary.cgstAmount + summary.sgstAmount + summary.igstAmount)}
                {summary.igstAmount > 0 ? ' (IGST)' : ' (CGST + SGST)'}
              </p>
            )}
          </dl>

          <Button type="submit" block size="lg" className="mt-5" disabled={isPaying || !summary}>
            {isPaying ? (
              <>
                <Loader2 className="animate-spin" aria-hidden />
                Processing…
              </>
            ) : (
              <>
                <Lock aria-hidden />
                {paymentMethod === 'COD'
                  ? 'Place order'
                  : `Pay ${summary ? formatInrCompact(summary.totalAmount) : ''}`}
              </>
            )}
          </Button>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3.5" aria-hidden />
            Secure checkout · <Link href="/policies/returns" className="underline">Easy returns</Link>
          </p>
        </div>
      </aside>
    </form>
  )
}
