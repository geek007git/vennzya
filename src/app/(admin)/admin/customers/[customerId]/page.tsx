import { TRPCError } from '@trpc/server'
import { CalendarDays, IndianRupee, ShoppingCart } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  AdminCard,
  AdminPageHeader,
  DataTable,
  EmptyState,
  StatusBadge,
  Td,
} from '@/components/admin/kit'
import { Badge } from '@/components/ui/primitives'
import { formatDate, formatInrCompact } from '@/lib/format'
import { formatPhone } from '@/lib/india'
import { trpc } from '@/trpc/server'

export const metadata: Metadata = {
  title: 'Customer',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: typeof ShoppingCart
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className="size-4 text-espresso-500" aria-hidden />
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </div>
  )
}

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>
}) {
  const { customerId } = await params

  let customer: Awaited<ReturnType<typeof trpc.customers.byId>>

  try {
    customer = await trpc.customers.byId({ customerId })
  } catch (error) {
    if (error instanceof TRPCError) {
      if (error.code === 'NOT_FOUND') notFound()
      if (error.code === 'FORBIDDEN') {
        return (
          <EmptyState
            title="You don’t have permission to view customers"
            description="Ask the owner to grant you the customers permission if you need access."
          />
        )
      }
    }
    throw error
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={customer.name ?? 'Guest customer'}
        description={`Customer since ${formatDate(customer.createdAt)}`}
        backHref={{ href: '/admin/customers', label: 'Customers' }}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Orders" value={String(customer.orderCount)} icon={ShoppingCart} />
        <StatCard
          label="Lifetime value"
          value={formatInrCompact(customer.lifetimeValue)}
          icon={IndianRupee}
        />
        <StatCard label="Joined" value={formatDate(customer.createdAt)} icon={CalendarDays} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <div className="space-y-6">
          <AdminCard title="Contact">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Phone</dt>
                <dd>{customer.phoneNumber ? formatPhone(customer.phoneNumber) : '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd className="break-words">{customer.email ?? '—'}</dd>
              </div>
            </dl>
          </AdminCard>

          <AdminCard
            title="Saved addresses"
            description={
              customer.addresses.length === 0 ? undefined : `${customer.addresses.length} on file`
            }
          >
            {customer.addresses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No saved addresses. Guest orders keep their own copy of the delivery address.
              </p>
            ) : (
              <ul className="space-y-4">
                {customer.addresses.map((address) => (
                  <li key={address.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{address.fullName}</span>
                      {address.isDefault && <Badge variant="outline">Default</Badge>}
                    </div>
                    <address className="mt-1 not-italic leading-relaxed text-muted-foreground">
                      {address.line1}
                      {address.line2 && <>, {address.line2}</>}
                      <br />
                      {address.city}, {address.state} {address.postalCode}
                      <br />
                      {formatPhone(address.phone)}
                    </address>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold">Order history</h2>

          {customer.orders.length === 0 ? (
            <EmptyState
              title="No orders yet"
              description="This customer has an account but hasn’t completed an order."
            />
          ) : (
            <DataTable head={['Order', 'Placed', 'Items', 'Payment', 'Shipping', 'Total']}>
              {customer.orders.map((order) => (
                <tr key={order.id} className="hover:bg-espresso-50">
                  <Td>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {formatDate(order.placedAt)}
                  </Td>
                  <Td className="text-muted-foreground">{order._count.items}</Td>
                  <Td className="whitespace-nowrap">
                    <StatusBadge
                      status={order.paymentStatus}
                      label={`${order.paymentMethod === 'COD' ? 'COD' : 'Online'} · ${order.paymentStatus.replace(/_/g, ' ').toLowerCase()}`}
                    />
                  </Td>
                  <Td>
                    <StatusBadge status={order.shippingStatus} />
                  </Td>
                  <Td align="right" className="whitespace-nowrap font-medium">
                    {formatInrCompact(order.totalAmount)}
                  </Td>
                </tr>
              ))}
            </DataTable>
          )}
        </div>
      </div>
    </div>
  )
}
