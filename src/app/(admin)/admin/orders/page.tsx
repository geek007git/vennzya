import type { Metadata } from 'next'
import Link from 'next/link'
import {
  AdminCard,
  AdminPageHeader,
  CursorPager,
  DataTable,
  EmptyState,
  StatusBadge,
  Td,
} from '@/components/admin/kit'
import { Button } from '@/components/ui/button'
import { formatDate, formatInrCompact } from '@/lib/format'
import { trpc } from '@/trpc/server'

export const metadata: Metadata = {
  title: 'Orders',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type RawSearchParams = Record<string, string | string[] | undefined>

const ORDER_STATUSES = [
  'CREATED',
  'CONFIRMED',
  'PROCESSING',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
] as const

const PAYMENT_STATUSES = [
  'PENDING',
  'PAID',
  'FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
  'COD_PENDING',
  'COD_COLLECTED',
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
type PaymentStatus = (typeof PAYMENT_STATUSES)[number]
type ShippingStatus = (typeof SHIPPING_STATUSES)[number]

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function labelFor(value: string): string {
  const words = value.toLowerCase().replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function isForbidden(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'FORBIDDEN'
  )
}

const selectClass =
  'h-11 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-xs'

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>
}) {
  const params = await searchParams

  const q = first(params.q)?.trim() || undefined
  const statusParam = first(params.status)
  const paymentParam = first(params.payment)
  const shippingParam = first(params.shipping)
  const cursor = first(params.cursor)

  const status = ORDER_STATUSES.includes(statusParam as OrderStatus)
    ? (statusParam as OrderStatus)
    : undefined
  const paymentStatus = PAYMENT_STATUSES.includes(paymentParam as PaymentStatus)
    ? (paymentParam as PaymentStatus)
    : undefined
  const shippingStatus = SHIPPING_STATUSES.includes(shippingParam as ShippingStatus)
    ? (shippingParam as ShippingStatus)
    : undefined

  const limit = 25

  let result: Awaited<ReturnType<typeof trpc.orders.adminList>> | null = null
  let forbidden = false

  try {
    result = await trpc.orders.adminList({
      ...(q ? { q } : {}),
      ...(status ? { status } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(shippingStatus ? { shippingStatus } : {}),
      ...(cursor ? { cursor } : {}),
      limit,
    })
  } catch (error) {
    if (isForbidden(error)) forbidden = true
    else throw error
  }

  if (forbidden || !result) {
    return (
      <>
        <AdminPageHeader title="Orders" />
        <AdminCard title="No access">
          <p className="text-sm text-muted-foreground">
            You don’t have permission to view orders. Ask the owner to grant you order access.
          </p>
        </AdminCard>
      </>
    )
  }

  const orders = result.items

  const activeFilters = [q, status, paymentStatus, shippingStatus].filter(Boolean).length

  function hrefWith(changes: Record<string, string | null>): string {
    const next = new URLSearchParams()
    if (q) next.set('q', q)
    if (status) next.set('status', status)
    if (paymentStatus) next.set('payment', paymentStatus)
    if (shippingStatus) next.set('shipping', shippingStatus)

    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }

    const query = next.toString()
    return query ? `/admin/orders?${query}` : '/admin/orders'
  }

  return (
    <>
      <AdminPageHeader
        title="Orders"
        description={
          activeFilters > 0
            ? `${orders.length} ${orders.length === 1 ? 'order' : 'orders'} matching your filters`
            : 'Every order placed, newest first.'
        }
        action={
          activeFilters > 0 ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/orders">Clear filters</Link>
            </Button>
          ) : undefined
        }
      />

      <form method="get" action="/admin/orders" className="mb-5">
        <div className="grid gap-3 rounded-[var(--radius-card)] border border-border bg-card p-4 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto] md:items-end">
          <div className="space-y-1.5">
            <label htmlFor="q" className="text-xs font-medium text-muted-foreground">
              Search
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q ?? ''}
              placeholder="Order number, phone or email"
              className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-xs placeholder:text-muted-foreground/70"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="status" className="text-xs font-medium text-muted-foreground">
              Order status
            </label>
            <select id="status" name="status" defaultValue={status ?? ''} className={selectClass}>
              <option value="">Any</option>
              {ORDER_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {labelFor(value)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="payment" className="text-xs font-medium text-muted-foreground">
              Payment
            </label>
            <select
              id="payment"
              name="payment"
              defaultValue={paymentStatus ?? ''}
              className={selectClass}
            >
              <option value="">Any</option>
              {PAYMENT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {labelFor(value)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="shipping" className="text-xs font-medium text-muted-foreground">
              Shipping
            </label>
            <select
              id="shipping"
              name="shipping"
              defaultValue={shippingStatus ?? ''}
              className={selectClass}
            >
              <option value="">Any</option>
              {SHIPPING_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {labelFor(value)}
                </option>
              ))}
            </select>
          </div>

          <Button type="submit" className="md:w-auto">
            Filter
          </Button>
        </div>
      </form>

      {orders.length === 0 ? (
        <EmptyState
          title={activeFilters > 0 ? 'No orders match those filters' : 'No orders yet'}
          description={
            activeFilters > 0
              ? 'Try widening the filters, or clear them to see everything.'
              : 'Orders will appear here the moment the first one comes in.'
          }
          action={
            activeFilters > 0 ? (
              <Button asChild variant="outline">
                <Link href="/admin/orders">Clear filters</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <DataTable
            head={['Order', 'Customer', 'Placed', 'Payment', 'Shipping', 'Items', 'Total']}
          >
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-espresso-50">
                <Td>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {order.contactPhone}
                  </span>
                </Td>
                <Td className="text-muted-foreground">{order.user?.name ?? 'Guest'}</Td>
                <Td className="whitespace-nowrap text-muted-foreground">
                  {formatDate(order.placedAt)}
                </Td>
                <Td>
                  <StatusBadge
                    status={order.paymentStatus}
                    label={`${order.paymentMethod === 'COD' ? 'COD' : 'Online'} · ${labelFor(order.paymentStatus)}`}
                  />
                </Td>
                <Td>
                  <StatusBadge status={order.shippingStatus} />
                </Td>
                <Td className="text-muted-foreground">{order._count.items}</Td>
                <Td align="right" className="font-medium">
                  {formatInrCompact(order.totalAmount)}
                </Td>
              </tr>
            ))}
          </DataTable>

          <CursorPager
            hasMore={result.nextCursor !== null}
            {...(result.nextCursor ? { nextHref: hrefWith({ cursor: result.nextCursor }) } : {})}
          />
        </>
      )}
    </>
  )
}
