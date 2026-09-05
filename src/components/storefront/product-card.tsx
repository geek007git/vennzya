import Image from 'next/image'
import Link from 'next/link'
import { formatInrCompact } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ProductCardView } from '@/modules/catalog/service'
import { Badge } from '@/components/ui/primitives'

function discountPercent(price: number, compareAt: number | null): number | null {
  if (!compareAt || compareAt <= price) return null
  return Math.round(((compareAt - price) / compareAt) * 100)
}

export function ProductCard({
  product,
  priority = false,
  className,
}: {
  product: ProductCardView
  priority?: boolean
  className?: string
}) {
  const discount = discountPercent(product.price, product.compareAtPrice)

  return (
    <article className={cn('group', className)} data-testid="product-card">
      <Link
        href={`/products/${product.slug}`}
        className="block"
        data-testid="product-card-link"
        data-in-stock={product.isOutOfStock ? 'false' : 'true'}
      >
        <div className="relative aspect-4/5 overflow-hidden rounded-[var(--radius-card)] bg-espresso-100">
          {product.image ? (
            <Image
              src={product.image.url}
              alt={product.image.altText ?? product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              priority={priority}
              placeholder={product.image.blurDataUrl ? 'blur' : 'empty'}
              blurDataURL={product.image.blurDataUrl ?? undefined}
              className={cn(
                'object-cover transition-transform duration-500 ease-[var(--ease-out-soft)]',
                product.hoverImage ? 'group-hover:opacity-0' : 'group-hover:scale-[1.03]',
                product.isOutOfStock && 'opacity-70',
              )}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              No image
            </div>
          )}

          {product.hoverImage && (
            <Image
              src={product.hoverImage.url}
              alt=""
              aria-hidden
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover opacity-0 transition-opacity duration-500 ease-[var(--ease-out-soft)] group-hover:opacity-100"
            />
          )}

          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {product.isOutOfStock ? (
              <Badge variant="muted">Sold out</Badge>
            ) : (
              <>
                {discount && <Badge variant="sale">{discount}% off</Badge>}
                {product.isLowStock && <Badge variant="muted">Only a few left</Badge>}
              </>
            )}
          </div>
        </div>

        <div className="space-y-1 pt-3">
          {product.categoryName && (
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {product.categoryName}
            </p>
          )}
          <h3 className="text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-espresso-700">
            {product.name}
          </h3>
          <p className="flex items-baseline gap-2 text-sm">
            <span className="font-semibold text-foreground">
              {product.hasPriceRange ? `From ${formatInrCompact(product.price)}` : formatInrCompact(product.price)}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-xs text-muted-foreground line-through">
                {formatInrCompact(product.compareAtPrice)}
              </span>
            )}
          </p>
        </div>
      </Link>
    </article>
  )
}

export function ProductGrid({
  products,
  priorityCount = 4,
  className,
}: {
  products: ProductCardView[]
  priorityCount?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-3 xl:grid-cols-4',
        className,
      )}
    >
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index < priorityCount} />
      ))}
    </div>
  )
}
