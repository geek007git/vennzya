import { AlertTriangle, IndianRupee, MessageSquare, type Package, Truck } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge } from '@/components/ui/primitives'
import { formatDate, formatInrCompact } from '@/lib/format'
import { trpc } from '@/trpc/server'

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  tone = 'default',
}: {
  label: string
  value: string
  hint?: string
  icon: typeof Package
  href?: string
  tone?: 'default' | 'warning'
}) {
  const content = (
    <div
      className={`rounded-[var(--radius-card)] border bg-card p-5 transition-colors ${
        tone === 'warning' ? 'border-destructive/30' : 'border-border'
      } ${href ? 'hover:border-espresso-400' : ''}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon
          className={`size-4 ${tone === 'warning' ? 'text-destructive' : 'text-espresso-500'}`}
          aria-hidden
        />
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )

  return href ? <Link href={href}>{content}</Link> : content
}

export default async function AdminDashboardPage() {
  const summary = await trpc.dashboard.summary()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here’s where your store stands right now.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today"
          value={formatInrCompact(summary.today.revenue)}
          hint={`${summary.today.orders} ${summary.today.orders === 1 ? 'order' : 'orders'}`}
          icon={IndianRupee}
        />
        <StatCard
          label="Last 30 days"
          value={formatInrCompact(summary.last30Days.revenue)}
          hint={`${summary.last30Days.orders} orders`}
          icon={IndianRupee}
        />
        <StatCard
          label="To fulfil"
          value={String(summary.pendingFulfilment)}
          hint="Paid or confirmed, not yet shipped"
          icon={Truck}
          href="/admin/orders?shipping=NOT_SHIPPED"
          tone={summary.pendingFulfilment > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="COD to collect"
          value={String(summary.codAwaiting)}
          hint="Cash not yet recorded"
          icon={IndianRupee}
          href="/admin/orders?payment=COD_PENDING"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Low stock"
          value={String(summary.lowStockCount)}
          hint="Variants at or below their threshold"
          icon={AlertTriangle}
          href="/admin/stock?low=1"
          tone={summary.lowStockCount > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="New messages"
          value={String(summary.newContactCount)}
          hint="Unanswered contact form enquiries"
          icon={MessageSquare}
          href="/admin/messages"
          tone={summary.newContactCount > 0 ? 'warning' : 'default'}
        />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent orders</h2>
          <Link href="/admin/orders" className="text-sm underline underline-offset-4">
            View all
          </Link>
        </div>

        {summary.recentOrders.length === 0 ? (
          <p className="rounded-[var(--radius-card)] border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No orders yet. They’ll appear here as soon as the first one comes in.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Placed</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {summary.recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-espresso-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {order.user?.name ?? 'Guest'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(order.placedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          order.paymentStatus === 'PAID' || order.paymentStatus === 'COD_COLLECTED'
                            ? 'success'
                            : 'neutral'
                        }
                      >
                        {order.paymentMethod === 'COD' ? 'COD' : 'Online'} ·{' '}
                        {order.paymentStatus.replace('_', ' ').toLowerCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatInrCompact(order.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
