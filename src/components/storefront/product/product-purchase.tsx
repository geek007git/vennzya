'use client'

import { Check, Minus, Plus, ShoppingBag } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { WhatsAppIcon } from '@/components/ui/brand-icons'
import { Button } from '@/components/ui/button'
import { DynamicButton } from '@/components/ui/dynamic-button'
import { Badge } from '@/components/ui/primitives'
import { formatInrCompact } from '@/lib/format'
import { siteConfig, whatsappLink } from '@/lib/site-config'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/modules/cart/store'
import type { ProductDetailView } from '@/modules/catalog/service'
import { ProductGallery } from './product-gallery'

/** Selection state is one option value per option axis. */
type Selection = Record<string, string>

function findVariant(product: ProductDetailView, selection: Selection) {
  const optionIds = product.options.map((option) => option.id)
  if (optionIds.some((id) => !selection[id])) return null

  return (
    product.variants.find((variant) =>
      optionIds.every((id) => variant.optionValueIds[id] === selection[id]),
    ) ?? null
  )
}

/**
 * A value is offered only if some in-stock variant uses it *alongside the
 * other choices already made* — so the shopper can never assemble a
 * combination that does not exist.
 */
function isValueAvailable(
  product: ProductDetailView,
  selection: Selection,
  optionId: string,
  valueId: string,
) {
  return product.variants.some((variant) => {
    if (variant.stockQuantity <= 0) return false
    if (variant.optionValueIds[optionId] !== valueId) return false

    return Object.entries(selection).every(
      ([otherOptionId, otherValueId]) =>
        otherOptionId === optionId || variant.optionValueIds[otherOptionId] === otherValueId,
    )
  })
}

/** How long the add-to-bag button stays in its confirmed state. */
const ADDED_MS = 1600

export function ProductPurchase({ product }: { product: ProductDetailView }) {
  const router = useRouter()
  const addLine = useCartStore((state) => state.addLine)
  const [justAdded, setJustAdded] = useState(false)
  const addedTimer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (addedTimer.current !== null) window.clearTimeout(addedTimer.current)
    },
    [],
  )

  const [selection, setSelection] = useState<Selection>(() => {
    // Preselect single-choice axes; the shopper shouldn't click what can't vary.
    const initial: Selection = {}
    for (const option of product.options) {
      const firstAvailable = option.values.find((value) => value.available)
      if (option.values.length === 1 && firstAvailable) initial[option.id] = firstAvailable.id
    }
    return initial
  })
  const [quantity, setQuantity] = useState(1)

  const selectedVariant = useMemo(() => findVariant(product, selection), [product, selection])
  const singleVariant = product.options.length === 0 ? (product.variants[0] ?? null) : null
  const variant = selectedVariant ?? singleVariant

  const price = variant?.price ?? product.priceFrom
  const compareAtPrice = variant?.compareAtPrice ?? null
  const maxQuantity = variant ? Math.min(variant.stockQuantity, 10) : 10
  const canAdd = variant !== null && variant.stockQuantity > 0

  function variantLabel(): string {
    return product.options
      .map((option) => {
        const valueId = selection[option.id]
        const value = option.values.find((v) => v.id === valueId)
        return value ? `${option.name} ${value.value}` : null
      })
      .filter(Boolean)
      .join(' · ')
  }

  function addToCart(): boolean {
    if (!variant) {
      toast.error('Please choose an option first', {
        description: `Select a ${product.options.map((o) => o.name.toLowerCase()).join(' and ')} to continue.`,
      })
      return false
    }

    if (variant.stockQuantity <= 0) {
      toast.error('That combination is sold out')
      return false
    }

    addLine(
      {
        variantId: variant.id,
        productId: product.id,
        slug: product.slug,
        name: product.name,
        sku: variant.sku,
        variantLabel: variantLabel(),
        unitPrice: variant.price,
        imageUrl: product.images[0]?.url ?? null,
        maxQuantity: variant.stockQuantity,
      },
      quantity,
    )

    toast.success('Added to bag', { description: product.name })

    setJustAdded(true)
    if (addedTimer.current !== null) window.clearTimeout(addedTimer.current)
    addedTimer.current = window.setTimeout(() => setJustAdded(false), ADDED_MS)

    return true
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
      <ProductGallery
        images={product.images}
        productName={product.name}
        activeVariantId={variant?.id ?? null}
      />

      <div className="flex flex-col gap-6">
        <div className="space-y-2">
          {product.brand && <p className="eyebrow">{product.brand}</p>}
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{product.name}</h1>
          {product.shortDescription && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {product.shortDescription}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-2xl font-semibold">{formatInrCompact(price)}</span>
          {compareAtPrice && compareAtPrice > price && (
            <>
              <span className="text-sm text-muted-foreground line-through">
                {formatInrCompact(compareAtPrice)}
              </span>
              <Badge variant="sale">
                {Math.round(((compareAtPrice - price) / compareAtPrice) * 100)}% off
              </Badge>
            </>
          )}
          <span className="w-full text-xs text-muted-foreground">Inclusive of all taxes</span>
        </div>

        {product.options.map((option) => (
          <fieldset key={option.id} className="space-y-3" data-testid="product-option">
            <legend className="mb-2 flex w-full items-baseline justify-between text-sm font-medium">
              <span>{option.name}</span>
              {selection[option.id] && (
                <span className="text-xs text-muted-foreground">
                  {option.values.find((v) => v.id === selection[option.id])?.value}
                </span>
              )}
            </legend>

            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const isSelected = selection[option.id] === value.id
                const available = isValueAvailable(product, selection, option.id, value.id)

                return (
                  <button
                    key={value.id}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={!available}
                    title={available ? value.value : `${value.value} — sold out`}
                    onClick={() => {
                      setSelection((prev) => ({ ...prev, [option.id]: value.id }))
                      setQuantity(1)
                    }}
                    className={cn(
                      'flex min-h-11 items-center gap-2 rounded-md border px-4 text-sm transition-colors',
                      isSelected
                        ? 'border-espresso-800 bg-espresso-800 text-cream-50'
                        : 'border-border hover:border-espresso-400',
                      !available && 'cursor-not-allowed opacity-40 line-through',
                    )}
                  >
                    {option.isSwatch && (
                      <span
                        aria-hidden
                        className="size-4 rounded-full border border-espresso-200"
                        style={{ backgroundColor: value.swatchHex ?? 'transparent' }}
                      />
                    )}
                    {value.value}
                  </button>
                )
              })}
            </div>
          </fieldset>
        ))}

        {variant?.isLowStock && (
          <p className="text-xs font-medium text-destructive">
            Only {variant.stockQuantity} left in this option
          </p>
        )}

        <div className="flex items-center gap-4">
          <div className="flex items-center rounded-md border border-border">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
              className="flex size-11 items-center justify-center disabled:opacity-40"
            >
              <Minus className="size-4" aria-hidden />
            </button>
            <span aria-live="polite" className="w-10 text-center text-sm font-medium">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
              disabled={quantity >= maxQuantity}
              aria-label="Increase quantity"
              className="flex size-11 items-center justify-center disabled:opacity-40"
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </div>

          {product.isOutOfStock && <Badge variant="neutral">Sold out</Badge>}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <DynamicButton
            className="flex-1"
            data-testid="add-to-bag"
            disabled={product.isOutOfStock || (variant !== null && !canAdd)}
            icon={justAdded ? <Check aria-hidden /> : <ShoppingBag aria-hidden />}
            onClick={addToCart}
            size="lg"
            stateKey={justAdded ? 'added' : 'add'}
            width="full"
          >
            {justAdded ? 'Added to bag' : 'Add to bag'}
          </DynamicButton>
          <Button
            size="lg"
            variant="outline"
            className="flex-1"
            disabled={product.isOutOfStock}
            onClick={() => {
              if (addToCart()) router.push('/checkout')
            }}
          >
            Buy now
          </Button>
        </div>

        <Button asChild variant="ghost" size="sm" className="self-start">
          <a
            href={whatsappLink(
              `Hi ${siteConfig.shortName}! I'd like to know more about "${product.name}" (${siteConfig.url}/products/${product.slug}).`,
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppIcon className="size-4" />
            Ask about this piece on WhatsApp
          </a>
        </Button>
      </div>
    </div>
  )
}
