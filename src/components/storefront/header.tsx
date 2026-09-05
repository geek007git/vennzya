import { User } from 'lucide-react'
import Link from 'next/link'
import { siteConfig } from '@/lib/site-config'
import { buildCategoryTree } from '@/modules/catalog/categories'
import { trpc } from '@/trpc/server'
import { CartButton } from './cart-button'
import { MobileNav, type NavCategory } from './mobile-nav'
import { SearchBar, SearchTrigger } from './search-bar'

const STATIC_LINKS = [
  { href: '/shop', label: 'Shop' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

export async function Header() {
  const categories = await trpc.catalog.categories()

  const topLevel: NavCategory[] = buildCategoryTree(categories).map((category) => ({
    name: category.name,
    slug: category.slug,
    children: category.children.map((child) => ({ name: child.name, slug: child.slug })),
  }))

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-cream-100/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center gap-2 md:h-20 md:gap-6">
        <MobileNav categories={topLevel} />

        <Link href="/" className="mr-auto flex items-baseline gap-1.5 lg:mr-8">
          <span className="font-display text-xl font-extrabold tracking-tight text-espresso-900 md:text-2xl">
            {siteConfig.shortName}
          </span>
          <span className="hidden text-[10px] uppercase tracking-[0.24em] text-muted-foreground sm:inline">
            Fashion Hub
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
          {topLevel.map((category) => (
            <div key={category.slug} className="group relative">
              <Link
                href={`/shop/${category.slug}`}
                className="py-2 text-sm font-medium text-foreground transition-colors hover:text-espresso-600"
              >
                {category.name}
              </Link>

              {category.children.length > 0 && (
                <div className="invisible absolute left-1/2 top-full z-50 w-56 -translate-x-1/2 pt-3 opacity-0 transition-opacity duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <ul className="rounded-[var(--radius-card)] border border-border bg-card p-2 shadow-card">
                    {category.children.map((child) => (
                      <li key={child.slug}>
                        <Link
                          href={`/shop/${child.slug}`}
                          className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-espresso-50 hover:text-foreground"
                        >
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}

          {STATIC_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-foreground transition-colors hover:text-espresso-600"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <SearchBar className="hidden w-56 md:block xl:w-72" />
          <SearchTrigger />
          <Link
            href="/account"
            aria-label="My account"
            className="hidden size-11 items-center justify-center rounded-md text-foreground transition-colors hover:bg-espresso-100 sm:inline-flex"
          >
            <User className="size-5" aria-hidden />
          </Link>
          <CartButton />
        </div>
      </div>
    </header>
  )
}
