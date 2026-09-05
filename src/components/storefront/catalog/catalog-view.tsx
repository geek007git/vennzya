import Link from 'next/link'
import { ProductGrid } from '@/components/storefront/product-card'
import { Button } from '@/components/ui/button'
import type { ProductCardView } from '@/modules/catalog/service'
import { buildCatalogHref } from '@/modules/catalog/search-params'
import {
  FilterDrawer,
  FilterSidebar,
  SortSelect,
  type FacetOption,
} from './filter-controls'

interface CatalogViewProps {
  basePath: string
  searchParams: URLSearchParams
  products: ProductCardView[]
  totalCount: number
  page: number
  pageSize: number
  facets: FacetOption[]
  priceBounds: { min: number; max: number }
  activeOptions: Record<string, string[]>
  activeFilterCount: number
}

export function CatalogView({
  basePath,
  searchParams,
  products,
  totalCount,
  page,
  pageSize,
  facets,
  priceBounds,
  activeOptions,
  activeFilterCount,
}: CatalogViewProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const filterProps = { facets, priceBounds, activeOptions, activeFilterCount }

  return (
    <div className="flex gap-10">
      <FilterSidebar {...filterProps} />

      <div className="min-w-0 flex-1">
        <div className="mb-6 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {totalCount} {totalCount === 1 ? 'piece' : 'pieces'}
          </p>
          <div className="flex items-center gap-2">
            <FilterDrawer {...filterProps} />
            <SortSelect />
          </div>
        </div>

        {products.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-border py-20 text-center">
            <h2 className="text-lg font-semibold">Nothing matches those filters</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Try widening your price range or clearing a filter — new pieces land every week.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link href={basePath}>Clear filters</Link>
            </Button>
          </div>
        ) : (
          <ProductGrid products={products} />
        )}

        {totalPages > 1 && (
          <nav className="mt-12 flex items-center justify-center gap-2" aria-label="Pagination">
            {page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link href={buildCatalogHref(basePath, searchParams, { page: String(page - 1) })}>
                  Previous
                </Link>
              </Button>
            )}

            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <Button
                key={pageNumber}
                asChild
                size="sm"
                variant={pageNumber === page ? 'primary' : 'ghost'}
              >
                <Link
                  href={buildCatalogHref(basePath, searchParams, { page: String(pageNumber) })}
                  aria-current={pageNumber === page ? 'page' : undefined}
                >
                  {pageNumber}
                </Link>
              </Button>
            ))}

            {page < totalPages && (
              <Button asChild variant="outline" size="sm">
                <Link href={buildCatalogHref(basePath, searchParams, { page: String(page + 1) })}>
                  Next
                </Link>
              </Button>
            )}
          </nav>
        )}
      </div>
    </div>
  )
}
