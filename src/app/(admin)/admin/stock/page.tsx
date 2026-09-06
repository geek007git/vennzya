import { AlertTriangle } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { AdminPageHeader, DataTable, EmptyState, Td } from '@/components/admin/kit'
import { isForbidden, PermissionDenied } from '@/components/admin/products/permission-denied'
import { LowStockToggle, StockAdjuster } from '@/components/admin/products/stock-controls'
import { Button } from '@/components/ui/button'
import { formatInrCompact } from '@/lib/format'
import { trpc } from '@/trpc/server'

export const metadata: Metadata = {
  title: 'Stock',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminStockPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const lowParam = Array.isArray(params.low) ? params.low[0] : params.low
  const lowStockOnly = lowParam === '1'

  let variants: Awaited<ReturnType<typeof trpc.catalogAdmin.stock>>
  try {
    variants = await trpc.catalogAdmin.stock({ lowStockOnly })
  } catch (error) {
    if (isForbidden(error)) return <PermissionDenied what="manage stock" />
    throw error
  }

  const lowCount = variants.filter((variant) => variant.isLow).length

  return (
    <div>
      <AdminPageHeader
        title="Stock"
        description={
          lowStockOnly
            ? 'Variants at or below their low-stock threshold.'
            : 'Every sellable variant, lowest stock first.'
        }
        action={<LowStockToggle />}
      />

      {!lowStockOnly && lowCount > 0 && (
        <p className="mb-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          {lowCount} {lowCount === 1 ? 'variant needs' : 'variants need'} restocking.
        </p>
      )}

      {variants.length === 0 ? (
        <EmptyState
          title={lowStockOnly ? 'Nothing is running low' : 'No variants yet'}
          description={
            lowStockOnly
              ? 'Every variant is above its low-stock threshold.'
              : 'Add a product with variants and its stock will show up here.'
          }
          action={
            lowStockOnly ? (
              <Button asChild variant="outline">
                <Link href="/admin/stock">Show all stock</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/admin/products/new">New product</Link>
              </Button>
            )
          }
        />
      ) : (
        <DataTable head={['Product', 'SKU', 'Price', 'In stock', 'Low at', 'Adjust']}>
          {variants.map((variant) => (
            <tr key={variant.id} className="hover:bg-espresso-50">
              <Td>
                <p className="font-medium">{variant.productName}</p>
                {variant.variantLabel && (
                  <p className="text-xs text-muted-foreground">{variant.variantLabel}</p>
                )}
              </Td>
              <Td className="font-mono text-xs text-muted-foreground">{variant.sku}</Td>
              <Td>{formatInrCompact(variant.price)}</Td>
              <Td>
                <span
                  className={
                    variant.isLow ? 'flex items-center gap-1.5 font-medium text-destructive' : ''
                  }
                >
                  {variant.isLow && <AlertTriangle className="size-3.5" aria-hidden />}
                  {variant.stockQuantity}
                </span>
              </Td>
              <Td className="text-muted-foreground">{variant.lowStockThreshold}</Td>
              <Td align="right">
                <div className="flex justify-end">
                  <StockAdjuster
                    variantId={variant.id}
                    sku={variant.sku}
                    productName={variant.productName}
                    variantLabel={variant.variantLabel}
                    stockQuantity={variant.stockQuantity}
                  />
                </div>
              </Td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  )
}
