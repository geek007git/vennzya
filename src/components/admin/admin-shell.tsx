'use client'

import {
  BadgePercent,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  ScrollText,
  ShieldCheck,
  ShoppingCart,
  Users,
  Warehouse,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { signOut } from '@/lib/auth-client'
import { siteConfig } from '@/lib/site-config'
import { cn } from '@/lib/utils'
import type { PermissionKey } from '@/modules/staff/permissions'

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
  permission: PermissionKey | null
}

const NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, permission: 'orders.manage' },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart, permission: 'orders.manage' },
  { href: '/admin/products', label: 'Products', icon: Package, permission: 'products.manage' },
  { href: '/admin/stock', label: 'Stock', icon: Warehouse, permission: 'products.manage' },
  {
    href: '/admin/discounts',
    label: 'Discounts',
    icon: BadgePercent,
    permission: 'discounts.manage',
  },
  { href: '/admin/customers', label: 'Customers', icon: Users, permission: 'customers.view' },
  { href: '/admin/messages', label: 'Messages', icon: MessageSquare, permission: 'support.manage' },
  { href: '/admin/content', label: 'Content', icon: ScrollText, permission: 'content.manage' },
  { href: '/admin/staff', label: 'Staff', icon: ShieldCheck, permission: 'staff.manage' },
]

export function AdminShell({
  user,
  permissions,
  children,
}: {
  user: { name: string; email: string; role: string }
  permissions: PermissionKey[]
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  // A staff member never sees a link they'd only be refused at.
  const visible = NAV.filter(
    (item) => item.permission === null || permissions.includes(item.permission),
  )

  async function handleSignOut() {
    await signOut()
    router.replace('/admin/login')
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 p-3" aria-label="Admin">
      {visible.map((item) => {
        const isActive =
          item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors',
              isActive
                ? 'bg-espresso-800 text-cream-50'
                : 'text-espresso-100/80 hover:bg-espresso-800/50 hover:text-cream-50',
            )}
          >
            <item.icon className="size-4 shrink-0" aria-hidden />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <div className="flex min-h-dvh bg-cream-100">
      <aside className="hidden w-60 shrink-0 flex-col bg-espresso-950 lg:flex">
        <div className="border-b border-cream-100/10 px-5 py-5">
          <p className="font-display text-lg font-extrabold tracking-tight text-cream-50">
            {siteConfig.shortName}
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-cream-200/50">Admin</p>
        </div>

        {nav}

        <div className="border-t border-cream-100/10 p-3">
          <p className="truncate px-3 text-xs font-medium text-cream-50">{user.name}</p>
          <p className="truncate px-3 text-[11px] text-cream-200/60">
            {user.role === 'OWNER' ? 'Owner' : 'Staff'}
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-2 flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-cream-200/80 transition-colors hover:bg-espresso-800/50 hover:text-cream-50"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-espresso-950/50"
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-espresso-950">
            <div className="flex items-center justify-between border-b border-cream-100/10 px-5 py-4">
              <p className="font-display text-lg font-extrabold text-cream-50">
                {siteConfig.shortName}
              </p>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-2 text-cream-50"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            {nav}
            <div className="border-t border-cream-100/10 p-3">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-cream-200/80"
              >
                <LogOut className="size-4" aria-hidden />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="inline-flex size-11 items-center justify-center rounded-md hover:bg-espresso-100"
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <p className="font-display font-bold">{siteConfig.shortName} Admin</p>
          <Button asChild variant="ghost" size="sm" className="ml-auto">
            <Link href="/">View store</Link>
          </Button>
        </header>

        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
