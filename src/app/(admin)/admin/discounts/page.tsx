import { TRPCError } from '@trpc/server'
import { Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { CouponRowActions } from '@/components/admin/discounts/coupon-row-actions'
import { AdminPageHeader, DataTable, EmptyState, StatusBadge, Td } from '@/components/admin/kit'
import { Button } from '@/components/ui/button'
import { formatDate, formatInrCompact } from '@/lib/format'
import { trpc } from '@/trpc/server'

export const metadata: Metadata = {
  title: 'Discounts',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type Coupon = Awaited<ReturnType<typeof trpc.discounts.list>>[number]

/** The offer as a shopper experiences it, not as it is stored. */
function describeOffer(coupon: Coupon): string {
  const base =
    coupon.type === 'PERCENTAGE' ? `${coupon.value}% off` : `${formatInrCompact(coupon.value)} off`

  return coupon.type === 'PERCENTAGE' && coupon.maxDiscountAmount
    ? `${base}, max ${formatInrCompact(coupon.maxDiscountAmount)}`
    : base
}

function describeWindow(coupon: Coupon): string {
  if (coupon.startsAt && coupon.expiresAt) {
    return `${formatDate(coupon.startsAt)} – ${formatDate(coupon.expiresAt)}`
  }
  if (coupon.expiresAt) return `Until ${formatDate(coupon.expiresAt)}`
  if (coupon.startsAt) return `From ${formatDate(coupon.startsAt)}`
  return 'Always'
}

function describeUsage(coupon: Coupon): string {
  const total = coupon.usageLimitTotal === null ? '∞' : coupon.usageLimitTotal
  const perCustomer =
    coupon.usageLimitPerCustomer === null ? null : `${coupon.usageLimitPerCustomer} per customer`

  return [`${coupon.usedCount} / ${total}`, perCustomer].filter(Boolean).join(' · ')
}

export default async function AdminDiscountsPage() {
  let coupons: Coupon[]

  try {
    coupons = await trpc.discounts.list({ includeInactive: true, limit: 100 })
  } catch (error) {
    if (error instanceof TRPCError && error.code === 'FORBIDDEN') {
      return (
        <EmptyState
          title="You don’t have permission to manage discounts"
          description="Ask the owner to grant you the discounts permission if you need access."
        />
      )
    }
    throw error
  }

  return (
    <div>
      <AdminPageHeader
        title="Discounts"
        description="Coupon codes shoppers can apply at checkout."
        action={
          <Button asChild>
            <Link href="/admin/discounts/new">
              <Plus aria-hidden />
              New coupon
            </Link>
          </Button>
        }
      />

      {coupons.length === 0 ? (
        <EmptyState
          title="No coupons yet"
          description="Create a code and it becomes available at checkout straight away."
          action={
            <Button asChild>
              <Link href="/admin/discounts/new">Create your first coupon</Link>
            </Button>
          }
        />
      ) : (
        <DataTable head={['Code', 'Offer', 'Minimum order', 'Usage', 'Valid', 'Status', '']}>
          {coupons.map((coupon) => (
            <tr key={coupon.id} className="hover:bg-espresso-50">
              <Td className="min-w-48">
                <Link
                  href={`/admin/discounts/${coupon.id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {coupon.code}
                </Link>
                {coupon.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{coupon.description}</p>
                )}
              </Td>
              <Td className="whitespace-nowrap">{describeOffer(coupon)}</Td>
              <Td className="whitespace-nowrap text-muted-foreground">
                {coupon.minOrderValue ? formatInrCompact(coupon.minOrderValue) : 'Any'}
              </Td>
              <Td className="whitespace-nowrap text-muted-foreground">{describeUsage(coupon)}</Td>
              <Td className="whitespace-nowrap text-muted-foreground">{describeWindow(coupon)}</Td>
              <Td className="whitespace-nowrap">
                <StatusBadge
                  status={coupon.isLive ? 'ACTIVE' : 'ARCHIVED'}
                  label={coupon.isLive ? 'Live' : coupon.isActive ? 'Not live' : 'Inactive'}
                />
              </Td>
              <Td align="right">
                <CouponRowActions
                  couponId={coupon.id}
                  code={coupon.code}
                  isActive={coupon.isActive}
                  redemptions={coupon.redemptions}
                />
              </Td>
            </tr>
          ))}
        </DataTable>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        “Not live” means the coupon is active but outside its date window or already fully claimed.
      </p>
    </div>
  )
}
