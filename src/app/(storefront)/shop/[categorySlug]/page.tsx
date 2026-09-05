import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CatalogView } from '@/components/storefront/catalog/catalog-view'
import { Container, SectionHeading } from '@/components/ui/primitives'
import { siteConfig } from '@/lib/site-config'
import { parseCatalogParams, type RawSearchParams } from '@/modules/catalog/search-params'
import { trpc } from '@/trpc/server'

interface PageProps {
  params: Promise<{ categorySlug: string }>
  searchParams: Promise<RawSearchParams>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { categorySlug } = await params
  const category = await trpc.catalog.categoryBySlug({ slug: categorySlug })

  if (!category) return { title: 'Category not found' }

  const title = category.seoTitle ?? category.name
  const description =
    category.seoDescription ??
    category.description ??
    `Shop ${category.name} at ${siteConfig.name}. Delivered across India with secure payment options.`

  return {
    title,
    description,
    alternates: { canonical: `/shop/${category.slug}` },
    openGraph: {
      title,
      description,
      ...(category.imageUrl ? { images: [{ url: category.imageUrl }] } : {}),
    },
  }
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const [{ categorySlug }, rawSearchParams] = await Promise.all([params, searchParams])

  const category = await trpc.catalog.categoryBySlug({ slug: categorySlug })
  if (!category) notFound()

  const { query, activeOptions, activeFilterCount } = parseCatalogParams(rawSearchParams, {
    category: categorySlug,
  })

  const [{ items }, totalCount, facets] = await Promise.all([
    trpc.catalog.list(query),
    trpc.catalog.count(query),
    trpc.catalog.facets(),
  ])

  const urlParams = new URLSearchParams()
  for (const [key, value] of Object.entries(rawSearchParams)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      for (const item of value) urlParams.append(key, item)
    } else {
      urlParams.set(key, value)
    }
  }

  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Shop', href: '/shop' },
    ...(category.parent
      ? [{ name: category.parent.name, href: `/shop/${category.parent.slug}` }]
      : []),
    { name: category.name, href: `/shop/${category.slug}` },
  ]

  return (
    <Container className="py-10 md:py-14">
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {breadcrumbs.map((crumb, index) => (
            <li key={crumb.href} className="flex items-center gap-1.5">
              {index > 0 && <span aria-hidden>/</span>}
              {index === breadcrumbs.length - 1 ? (
                <span className="text-foreground">{crumb.name}</span>
              ) : (
                <Link href={crumb.href} className="hover:text-foreground">
                  {crumb.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <SectionHeading
        as="h1"
        eyebrow="Category"
        title={category.name}
        {...(category.description ? { description: category.description } : {})}
      />

      {category.children.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {category.children.map((child) => (
            <Link
              key={child.id}
              href={`/shop/${child.slug}`}
              className="rounded-full border border-border px-4 py-2 text-sm transition-colors hover:border-espresso-400 hover:bg-espresso-50"
            >
              {child.name}
            </Link>
          ))}
        </div>
      )}

      <CatalogView
        basePath={`/shop/${categorySlug}`}
        searchParams={urlParams}
        products={items}
        totalCount={totalCount}
        page={query.page}
        pageSize={query.limit}
        facets={facets.options}
        priceBounds={facets.priceBounds}
        activeOptions={activeOptions}
        activeFilterCount={activeFilterCount}
      />
    </Container>
  )
}
