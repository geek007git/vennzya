import type { Metadata } from 'next'
import { CatalogView } from '@/components/storefront/catalog/catalog-view'
import { Container, SectionHeading } from '@/components/ui/primitives'
import { parseCatalogParams, type RawSearchParams } from '@/modules/catalog/search-params'
import { trpc } from '@/trpc/server'

export const metadata: Metadata = {
  title: 'Shop all',
  description:
    'Browse the full Vennzya Fashion Hub collection — women’s clothing, jewellery and fashion accessories, with secure payment and delivery across India.',
  alternates: { canonical: '/shop' },
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>
}) {
  const params = await searchParams
  const { query, activeOptions, activeFilterCount } = parseCatalogParams(params)

  const [{ items }, totalCount, facets] = await Promise.all([
    trpc.catalog.list(query),
    trpc.catalog.count(query),
    trpc.catalog.facets(),
  ])

  const urlParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      for (const item of value) urlParams.append(key, item)
    } else {
      urlParams.set(key, value)
    }
  }

  return (
    <Container className="py-10 md:py-14">
      <SectionHeading
        as="h1"
        eyebrow="The collection"
        title={query.q ? `Results for “${query.q}”` : 'Shop all'}
        description={
          query.q
            ? undefined
            : 'Everything we currently have in stock, from everyday pieces to occasion wear.'
        }
      />

      <CatalogView
        basePath="/shop"
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
