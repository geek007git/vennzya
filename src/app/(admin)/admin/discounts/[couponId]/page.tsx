import { TRPCError } from '@trpc/server'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CouponForm } from '@/components/admin/discounts/coupon-form'
import { AdminCard, AdminPageHeader, EmptyState } from '@/components/admin/kit'
import { trpc } from '@/trpc/server'

export const metadata: Metadata = {
  title: 'Edit coupon',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function EditCouponPage({
  params,
}: {
  params: Promise<{ couponId: string }>
}) {
  const { couponId } = await params

  let coupon: Awaited<ReturnType<typeof trpc.discounts.byId>>

  try {
    coupon = await trpc.discounts.byId({ couponId })
  } catch (error) {
    if (error instanceof TRPCError) {
      if (error.code === 'NOT_FOUND') notFound()
      if (error.code === 'FORBIDDEN') {
        return (
          <EmptyState
            title="You don’t have permission to manage discounts"
            description="Ask the owner to grant you the discounts permission if you need access."
          />
        )
      }
    }
    throw error
  }

  return (
    <div>
      <AdminPageHeader
        title={coupon.code}
        description={
          coupon.usedCount > 0
            ? `Used ${coupon.usedCount} time${coupon.usedCount === 1 ? '' : 's'} so far.`
            : 'Not used yet.'
        }
        backHref={{ href: '/admin/discounts', label: 'Discounts' }}
      />

      <AdminCard className="max-w-3xl">
        <CouponForm coupon={coupon} />
      </AdminCard>
    </div>
  )
}
