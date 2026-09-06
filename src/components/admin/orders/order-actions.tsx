'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { BanknoteArrowUp, Save, Truck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { AdminCard } from '@/components/admin/kit'
import { WhatsAppIcon } from '@/components/ui/brand-icons'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatInr } from '@/lib/format'
import { api } from '@/trpc/react'

const ORDER_STATUSES = [
  'CREATED',
  'CONFIRMED',
  'PROCESSING',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
] as const

const SHIPPING_STATUSES = [
  'NOT_SHIPPED',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'RETURN_INITIATED',
  'RETURNED',
] as const

type OrderStatus = (typeof ORDER_STATUSES)[number]
type ShippingStatus = (typeof SHIPPING_STATUSES)[number]

function labelFor(value: string): string {
  const words = value.toLowerCase().replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Please try again in a moment.'
}

export interface OrderActionsProps {
  orderId: string
  orderNumber: string
  status: OrderStatus
  shippingStatus: ShippingStatus
  paymentMethod: 'RAZORPAY' | 'COD'
  paymentStatus: string
  totalAmount: number
  adminNote: string | null
  customerPhone: string
  customerName: string
}

export function OrderActions(props: OrderActionsProps) {
  return (
    <div className="space-y-4">
      <StatusPanel {...props} />
      <TrackingPanel orderId={props.orderId} />
      <NotePanel orderId={props.orderId} adminNote={props.adminNote} />
    </div>
  )
}

function StatusPanel({
  orderId,
  orderNumber,
  status,
  shippingStatus,
  paymentMethod,
  paymentStatus,
  totalAmount,
  customerPhone,
  customerName,
}: OrderActionsProps) {
  const router = useRouter()
  const [nextStatus, setNextStatus] = useState<OrderStatus>(status)
  const [nextShipping, setNextShipping] = useState<ShippingStatus>(shippingStatus)
  const [codOpen, setCodOpen] = useState(false)

  const updateStatus = api.orders.updateStatus.useMutation()
  const markCod = api.orders.markCodCollected.useMutation()

  const isDirty = nextStatus !== status || nextShipping !== shippingStatus
  const showCod = paymentMethod === 'COD' && paymentStatus === 'COD_PENDING'

  async function save() {
    try {
      await updateStatus.mutateAsync({
        orderId,
        status: nextStatus,
        shippingStatus: nextShipping,
      })
      toast.success('Order updated', {
        description: `${orderNumber} is now ${labelFor(nextStatus).toLowerCase()} · ${labelFor(nextShipping).toLowerCase()}.`,
      })
      router.refresh()
    } catch (error) {
      toast.error('Couldn’t update the order', { description: errorMessage(error) })
    }
  }

  async function confirmCod() {
    try {
      const result = await markCod.mutateAsync({ orderId })
      setCodOpen(false)
      toast.success(
        result.alreadyCollected ? 'Already recorded as collected' : 'Cash payment recorded',
        { description: `${orderNumber} is now marked paid and completed.` },
      )
      router.refresh()
    } catch (error) {
      toast.error('Couldn’t record the payment', { description: errorMessage(error) })
    }
  }

  // The stored phone is already in 91XXXXXXXXXX form, so it addresses the
  // customer directly rather than the shop's own number.
  const whatsappHref = `https://wa.me/${customerPhone}?text=${encodeURIComponent(
    `Hi ${customerName}, an update on your Vennzya order ${orderNumber}: it is currently ${labelFor(shippingStatus).toLowerCase()}.`,
  )}`

  return (
    <AdminCard title="Status" description="Where this order stands right now.">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Order status" htmlFor="order-status">
            <Select value={nextStatus} onValueChange={(v) => setNextStatus(v as OrderStatus)}>
              <SelectTrigger id="order-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {labelFor(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Shipping status" htmlFor="shipping-status">
            <Select
              value={nextShipping}
              onValueChange={(v) => setNextShipping(v as ShippingStatus)}
            >
              <SelectTrigger id="shipping-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHIPPING_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {labelFor(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={save} disabled={!isDirty} loading={updateStatus.isPending}>
            <Save aria-hidden />
            Save status
          </Button>

          <Button asChild variant="whatsapp">
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon className="size-4" />
              Message customer
            </a>
          </Button>
        </div>

        {showCod && (
          <div className="rounded-md border border-border bg-espresso-50 p-4">
            <p className="text-sm font-medium">Cash on delivery — not yet collected</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Record this once the courier confirms the cash is in hand.
            </p>

            <Dialog open={codOpen} onOpenChange={setCodOpen}>
              <Button className="mt-3" variant="outline" onClick={() => setCodOpen(true)}>
                <BanknoteArrowUp aria-hidden />
                Record {formatInr(totalAmount)} collected
              </Button>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record cash payment?</DialogTitle>
                  <DialogDescription>
                    This records that <strong>{formatInr(totalAmount)}</strong> was collected in
                    cash for {orderNumber}, and marks the order paid and completed. It can’t be
                    undone from here.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost">Cancel</Button>
                  </DialogClose>
                  <Button onClick={confirmCod} loading={markCod.isPending}>
                    Yes, cash collected
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </AdminCard>
  )
}

const trackingSchema = z.object({
  courierName: z.string().trim().min(2, 'Which courier?').max(80),
  trackingNumber: z.string().trim().min(3, 'Enter the tracking number').max(80),
  trackingUrl: z.string().trim().url('Enter a valid link').or(z.literal('')).optional(),
})

type TrackingValues = z.input<typeof trackingSchema>

function TrackingPanel({ orderId }: { orderId: string }) {
  const router = useRouter()
  const addTracking = api.orders.addTracking.useMutation()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TrackingValues>({ resolver: zodResolver(trackingSchema) })

  async function onSubmit(values: TrackingValues) {
    try {
      await addTracking.mutateAsync({
        orderId,
        courierName: values.courierName,
        trackingNumber: values.trackingNumber,
        ...(values.trackingUrl ? { trackingUrl: values.trackingUrl } : {}),
      })
      toast.success('Tracking added', { description: 'The order is now marked as shipped.' })
      reset()
      router.refresh()
    } catch (error) {
      toast.error('Couldn’t add tracking', { description: errorMessage(error) })
    }
  }

  return (
    <AdminCard title="Add tracking" description="Saving this also marks the order shipped.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Courier" htmlFor="courierName" required error={errors.courierName?.message}>
            <Input
              id="courierName"
              placeholder="Delhivery, Bluedart…"
              {...register('courierName')}
            />
          </Field>

          <Field
            label="Tracking number"
            htmlFor="trackingNumber"
            required
            error={errors.trackingNumber?.message}
          >
            <Input id="trackingNumber" {...register('trackingNumber')} />
          </Field>
        </div>

        <Field
          label="Tracking link"
          htmlFor="trackingUrl"
          hint="Optional — the courier's tracking page"
          error={errors.trackingUrl?.message}
        >
          <Input id="trackingUrl" type="url" placeholder="https://…" {...register('trackingUrl')} />
        </Field>

        <Button type="submit" loading={isSubmitting}>
          <Truck aria-hidden />
          Save tracking
        </Button>
      </form>
    </AdminCard>
  )
}

function NotePanel({ orderId, adminNote }: { orderId: string; adminNote: string | null }) {
  const router = useRouter()
  const [note, setNote] = useState(adminNote ?? '')
  const updateStatus = api.orders.updateStatus.useMutation()

  async function save() {
    try {
      await updateStatus.mutateAsync({ orderId, adminNote: note })
      toast.success('Note saved')
      router.refresh()
    } catch (error) {
      toast.error('Couldn’t save the note', { description: errorMessage(error) })
    }
  }

  return (
    <AdminCard title="Internal note" description="Only staff can see this.">
      <div className="space-y-3">
        <Textarea
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={1000}
          placeholder="Anything the team should know about this order."
          aria-label="Internal note"
        />
        <Button
          variant="outline"
          onClick={save}
          disabled={note === (adminNote ?? '')}
          loading={updateStatus.isPending}
        >
          <Save aria-hidden />
          Save note
        </Button>
      </div>
    </AdminCard>
  )
}
