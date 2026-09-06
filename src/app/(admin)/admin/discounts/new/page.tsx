import type { Metadata } from 'next'
import { CouponForm } from '@/components/admin/discounts/coupon-form'
import { AdminCard, AdminPageHeader } from '@/components/admin/kit'

export const metadata: Metadata = {
  title: 'New coupon',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default function NewCouponPage() {
  return (
    <div>
      <AdminPageHeader
        title="New coupon"
        description="Set the rules once — checkout enforces them on every order."
        backHref={{ href: '/admin/discounts', label: 'Discounts' }}
      />

      <AdminCard className="max-w-3xl">
        <CouponForm />
      </AdminCard>
    </div>
  )
}
