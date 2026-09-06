'use client'

import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { siteConfig } from '@/lib/site-config'

export interface NavCategory {
  name: string
  slug: string
  children: { name: string; slug: string }[]
}

export function MobileNav({ categories }: { categories: NavCategory[] }) {
  const [open, setOpen] = useState(false)
  const _pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open menu"
        className="inline-flex size-11 items-center justify-center rounded-md text-foreground transition-colors hover:bg-espresso-100 lg:hidden"
      >
        <Menu className="size-5" aria-hidden />
      </SheetTrigger>

      <SheetContent side="left" className="w-[85vw] max-w-sm p-0">
        <SheetHeader className="flex-row items-center justify-between border-b border-border px-5 py-4">
          <SheetTitle className="font-display text-lg tracking-tight">
            {siteConfig.shortName}
          </SheetTitle>
          <SheetClose aria-label="Close menu" className="rounded-md p-2 hover:bg-espresso-100">
            <X className="size-5" aria-hidden />
          </SheetClose>
        </SheetHeader>

        <nav className="overflow-y-auto px-5 py-4" aria-label="Main">
          <Link href="/shop" className="block py-3 text-base font-medium">
            Shop all
          </Link>

          {categories.map((category) => (
            <div key={category.slug} className="border-t border-border py-3">
              <Link href={`/shop/${category.slug}`} className="block py-1 text-base font-medium">
                {category.name}
              </Link>
              {category.children.length > 0 && (
                <ul className="mt-1 space-y-1 pl-3">
                  {category.children.map((child) => (
                    <li key={child.slug}>
                      <Link
                        href={`/shop/${child.slug}`}
                        className="block py-2 text-sm text-muted-foreground"
                      >
                        {child.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          <div className="border-t border-border pt-3">
            {[
              { href: '/about', label: 'About us' },
              { href: '/testimonials', label: 'Reviews' },
              { href: '/faq', label: 'FAQ' },
              { href: '/contact', label: 'Contact' },
              { href: '/account', label: 'My account' },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="block py-3 text-sm">
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
