import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AdminLoginForm } from '@/components/admin/admin-login-form'
import { Skeleton } from '@/components/ui/primitives'
import { siteConfig } from '@/lib/site-config'

export const metadata: Metadata = {
  title: 'Staff sign in',
  robots: { index: false, follow: false },
}

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-cream-100 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <p className="font-display text-2xl font-extrabold tracking-tight text-espresso-900">
            {siteConfig.shortName}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.24em] text-muted-foreground">
            Store administration
          </p>
        </div>

        <div className="mt-8 rounded-[var(--radius-card)] border border-border bg-card p-6 shadow-card">
          <h1 className="text-lg font-semibold">Sign in</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Staff accounts only. Customers can sign in from the storefront.
          </p>
          {/* The form reads ?next= from the URL, which defers prerendering. */}
          <Suspense fallback={<Skeleton className="mt-6 h-64 w-full" />}>
            <AdminLoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
