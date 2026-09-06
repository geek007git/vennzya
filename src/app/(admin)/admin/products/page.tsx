import { AlertTriangle, Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  AdminPageHeader,
  CursorPager,
  DataTable,
  EmptyState,
  StatusBadge,
  Td,
} from '@/components/admin/kit'
import { isForbidden, PermissionDenied } from '@/components/admin/products/permission-denied'
import {
  ProductListControls,
  ProductStatusControl,
} from '@/components/admin/products/product-list-controls'
import { Button } from '@/components/ui/button'
import { formatDate, formatInrCompact } from '@/lib/format'
import { trpc } from '@/trpc/server'

export const metadata: Metadata = {
  title: 'Products',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type SearchParams = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function priceLabel(min: number | null, max: number | null): string {
  if (min === null) return '—'
  if (max === null || max === min) return formatInrCompact(min)
  return `${formatInrCompact(min)} – ${formatInrCompact(max)}`
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const statusParam = first(params.status)
  const status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | undefined =
    statusParam === 'ACTIVE' || statusParam === 'DRAFT' || statusParam === 'ARCHIVED'
      ? statusParam
      : undefined

  const query = {
    ...(first(params.q) ? { q: first(params.q) as string } : {}),
    ...(status ? { status } : {}),
    lowStockOnly: first(params.low) === '1',
    limit: 25,
    ...(first(params.cursor) ? { cursor: first(params.cursor) as string } : {}),
  }

  let result: Awaited<ReturnType<typeof trpc.catalogAdmin.products>>
  try {
    result = await trpc.catalogAdmin.products(query)
  } catch (error) {
    if (isForbidden(error)) return <PermissionDenied what="manage products" />
    throw error
  }

  const baseParams = new URLSearchParams()
  for (const key of ['q', 'status', 'low'] as const) {
    const value = first(params[key])
    if (value) baseParams.set(key, value)
  }

  const nextParams = new URLSearchParams(baseParams)
  if (result.nextCursor) nextParams.set('cursor', result.nextCursor)

  const hasFilters = Boolean(query.q || status || query.lowStockOnly)

  return (
    <div>
      <AdminPageHeader
        title="Products"
        description="Everything in the catalogue, newest edits first."
        action={
          <Button asChild>
            <Link href="/admin/products/new">
              <Plus aria-hidden />
              New product
            </Link>
          </Button>
        }
      />

      <ProductListControls />

      {result.items.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'No products match those filters' : 'No products yet'}
          description={
            hasFilters
              ? 'Try clearing the search or switching the status filter.'
              : 'Add your first piece and it will show up here.'
          }
          action={
            <Button asChild variant={hasFilters ? 'outline' : 'primary'}>
              <Link href={hasFilters ? '/admin/products' : '/admin/products/new'}>
                {hasFilters ? 'Clear filters' : 'New product'}
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <DataTable
            head={['Product', 'Category', 'Status', 'Price', 'Stock', 'Updated', 'Change status']}
          >
            {result.items.map((product) => (
              <tr key={product.id} className="hover:bg-espresso-50">
                <Td>
                  <div className="flex items-center gap-3">
                    <div className="size-10 shrink-0 overflow-hidden rounded-md bg-espresso-100">
                      {product.imageUrl && (
                        // Seed images come from hosts we allow-list, but an
                        // admin-pasted URL may not be — plain img never throws.
                        // biome-ignore lint/performance/noImgElement: arbitrary host
                        <img src={product.imageUrl} alt="" className="size-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {product.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {product.variantCount} {product.variantCount === 1 ? 'variant' : 'variants'}
                        {product.isFeatured && ' · Featured'}
                      </p>
                    </div>
                  </div>
                </Td>
                <Td className="text-muted-foreground">{product.categoryName ?? '—'}</Td>
                <Td>
                  <StatusBadge status={product.status} />
                </Td>
                <Td>{priceLabel(product.minPrice, product.maxPrice)}</Td>
                <Td>
                  <span
                    className={
                      product.totalStock <= 5 ? 'flex items-center gap-1.5 text-destructive' : ''
                    }
                  >
                    {product.totalStock <= 5 && <AlertTriangle className="size-3.5" aria-hidden />}
                    {product.totalStock}
                  </span>
                </Td>
                <Td className="text-muted-foreground">{formatDate(product.updatedAt)}</Td>
                <Td align="right">
                  <div className="flex justify-end">
                    <ProductStatusControl productId={product.id} status={product.status} />
                  </div>
                </Td>
              </tr>
            ))}
          </DataTable>

          <CursorPager
            hasMore={Boolean(result.nextCursor)}
            nextHref={`/admin/products?${nextParams.toString()}`}
            {...(first(params.cursor)
              ? { prevHref: `/admin/products?${baseParams.toString()}` }
              : {})}
          />
        </>
      )}
    </div>
  )
}
