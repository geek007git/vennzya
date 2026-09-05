import { TRPCError } from '@trpc/server'
import type { Prisma } from '@/generated/prisma/client'
import { db } from '@/server/db'
import { catalogRepository, type ProductCard, type ProductDetail } from './repository'
import type { ProductListInput, ProductUpsertInput } from './schema'

/**
 * Business rules for the catalogue, and the boundary where Prisma Decimals
 * become plain numbers — nothing above this layer should handle Decimal.
 */

const toNumber = (value: Prisma.Decimal | null | undefined): number | null =>
  value === null || value === undefined ? null : Number(value.toString())

export interface ProductCardView {
  id: string
  name: string
  slug: string
  shortDescription: string | null
  price: number
  compareAtPrice: number | null
  hasPriceRange: boolean
  maxPrice: number | null
  isOutOfStock: boolean
  isLowStock: boolean
  isFeatured: boolean
  categoryName: string | null
  image: { url: string; altText: string | null; blurDataUrl: string | null } | null
  hoverImage: { url: string; altText: string | null } | null
}

export function toProductCard(row: ProductCard): ProductCardView {
  const primary = row.images[0] ?? null
  const hover = row.images[1] ?? null
  const cheapestVariant = row.variants[0] ?? null
  const price = toNumber(row.minPrice) ?? toNumber(cheapestVariant?.price ?? null) ?? 0
  const maxPrice = toNumber(row.maxPrice)

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    shortDescription: row.shortDescription,
    price,
    compareAtPrice: toNumber(cheapestVariant?.compareAtPrice ?? null),
    hasPriceRange: maxPrice !== null && maxPrice > price,
    maxPrice,
    isOutOfStock: row.totalStock <= 0,
    isLowStock: row.totalStock > 0 && row.totalStock <= 5,
    isFeatured: row.isFeatured,
    categoryName: row.categories[0]?.category.name ?? null,
    image: primary
      ? { url: primary.url, altText: primary.altText, blurDataUrl: primary.blurDataUrl }
      : null,
    hoverImage: hover ? { url: hover.url, altText: hover.altText } : null,
  }
}

export interface VariantView {
  id: string
  sku: string
  price: number
  compareAtPrice: number | null
  stockQuantity: number
  isLowStock: boolean
  /** Option id → option value id, e.g. { size: "m", colour: "black" } */
  optionValueIds: Record<string, string>
}

export interface ProductDetailView {
  id: string
  name: string
  slug: string
  description: string
  shortDescription: string | null
  brand: string | null
  careInstructions: string | null
  seoTitle: string | null
  seoDescription: string | null
  priceFrom: number
  priceTo: number | null
  isOutOfStock: boolean
  categories: { id: string; name: string; slug: string }[]
  images: { id: string; url: string; altText: string | null; blurDataUrl: string | null; variantId: string | null }[]
  options: {
    id: string
    name: string
    isSwatch: boolean
    values: { id: string; value: string; swatchHex: string | null; available: boolean }[]
  }[]
  variants: VariantView[]
}

function buildDetailView(row: ProductDetail): ProductDetailView {
  const variants: VariantView[] = row.variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    price: toNumber(v.price) ?? 0,
    compareAtPrice: toNumber(v.compareAtPrice),
    stockQuantity: v.stockQuantity,
    isLowStock: v.stockQuantity > 0 && v.stockQuantity <= v.lowStockThreshold,
    optionValueIds: Object.fromEntries(
      v.optionValues.map((ov) => [ov.optionValue.optionId, ov.optionValue.id]),
    ),
  }))

  // An option value is offered only if some in-stock variant actually uses it,
  // so the PDP can't lead a shopper into a dead combination.
  const stockedValueIds = new Set(
    variants.flatMap((v) => (v.stockQuantity > 0 ? Object.values(v.optionValueIds) : [])),
  )

  const options = row.options.map(({ option }) => ({
    id: option.id,
    name: option.name,
    isSwatch: option.isSwatch,
    values: option.values
      .filter((value) => variants.some((v) => Object.values(v.optionValueIds).includes(value.id)))
      .map((value) => ({
        id: value.id,
        value: value.value,
        swatchHex: value.swatchHex,
        available: stockedValueIds.has(value.id),
      })),
  }))

  const prices = variants.map((v) => v.price)

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    shortDescription: row.shortDescription,
    brand: row.brand,
    careInstructions: row.careInstructions,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    priceFrom: prices.length ? Math.min(...prices) : 0,
    priceTo: prices.length ? Math.max(...prices) : null,
    isOutOfStock: row.totalStock <= 0,
    categories: row.categories.map((c) => c.category),
    images: row.images,
    options,
    variants,
  }
}

export const catalogService = {
  async listProducts(input: ProductListInput) {
    const { items, nextCursor } = await catalogRepository.listProducts(input)
    return { items: items.map(toProductCard), nextCursor }
  },

  async getProductBySlug(slug: string) {
    const row = await catalogRepository.findProductBySlug(slug)
    if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found.' })
    return buildDetailView(row)
  },

  async getRelatedProducts(productId: string, categoryIds: string[]) {
    const rows = await catalogRepository.findRelatedProducts(productId, categoryIds)
    return rows.map(toProductCard)
  },

  async getCollection(slug: string) {
    const row = await catalogRepository.findCollectionBySlug(slug)
    if (!row) return null
    return { ...row, products: row.products.map((p) => toProductCard(p.product)) }
  },

  /**
   * Keeps Product.minPrice/maxPrice/totalStock true to its variants. Called
   * after every write that can change price or stock — including order
   * placement — so the catalogue never advertises a stale price.
   */
  async syncProductAggregates(productId: string, client: Prisma.TransactionClient | typeof db = db) {
    const variants = await client.productVariant.findMany({
      where: { productId, isActive: true },
      select: { price: true, stockQuantity: true },
    })

    const prices = variants.map((v) => Number(v.price.toString()))
    const totalStock = variants.reduce((sum, v) => sum + v.stockQuantity, 0)

    await client.product.update({
      where: { id: productId },
      data: {
        minPrice: prices.length ? Math.min(...prices) : null,
        maxPrice: prices.length ? Math.max(...prices) : null,
        totalStock,
      },
    })
  },

  async upsertProduct(input: ProductUpsertInput, actorId: string) {
    const slugOwner = await db.product.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    })
    if (slugOwner && slugOwner.id !== input.id) {
      throw new TRPCError({ code: 'CONFLICT', message: 'That URL slug is already in use.' })
    }

    const productId = await db.$transaction(async (tx) => {
      const data = {
        name: input.name,
        slug: input.slug,
        description: input.description,
        shortDescription: input.shortDescription ?? null,
        status: input.status,
        hsnCode: input.hsnCode,
        gstRatePercent: input.gstRatePercent,
        brand: input.brand ?? null,
        careInstructions: input.careInstructions ?? null,
        seoTitle: input.seoTitle ?? null,
        seoDescription: input.seoDescription ?? null,
        isFeatured: input.isFeatured,
        publishedAt: input.status === 'ACTIVE' ? new Date() : null,
      }

      const product = input.id
        ? await tx.product.update({ where: { id: input.id }, data })
        : await tx.product.create({ data })

      await tx.productCategory.deleteMany({ where: { productId: product.id } })
      await tx.productCategory.createMany({
        data: input.categoryIds.map((categoryId) => ({ productId: product.id, categoryId })),
      })

      await tx.productOption.deleteMany({ where: { productId: product.id } })
      if (input.optionIds.length) {
        await tx.productOption.createMany({
          data: input.optionIds.map((optionId, index) => ({
            productId: product.id,
            optionId,
            sortOrder: index,
          })),
        })
      }

      // Variants absent from the payload are deactivated rather than deleted —
      // historical orders still point at them.
      const keptVariantIds = input.variants.map((v) => v.id).filter((id): id is string => !!id)
      await tx.productVariant.updateMany({
        where: { productId: product.id, id: { notIn: keptVariantIds } },
        data: { isActive: false },
      })

      for (const variant of input.variants) {
        const variantData = {
          productId: product.id,
          sku: variant.sku,
          price: variant.price,
          compareAtPrice: variant.compareAtPrice ?? null,
          stockQuantity: variant.stockQuantity,
          lowStockThreshold: variant.lowStockThreshold,
          weightGrams: variant.weightGrams ?? null,
          isActive: variant.isActive,
        }

        const saved = variant.id
          ? await tx.productVariant.update({ where: { id: variant.id }, data: variantData })
          : await tx.productVariant.create({ data: variantData })

        await tx.variantOptionValue.deleteMany({ where: { variantId: saved.id } })
        if (variant.optionValueIds.length) {
          await tx.variantOptionValue.createMany({
            data: variant.optionValueIds.map((optionValueId) => ({
              variantId: saved.id,
              optionValueId,
            })),
          })
        }
      }

      await tx.productImage.deleteMany({ where: { productId: product.id } })
      if (input.images.length) {
        await tx.productImage.createMany({
          data: input.images.map((image, index) => ({
            productId: product.id,
            variantId: image.variantId ?? null,
            url: image.url,
            publicId: image.publicId ?? null,
            altText: image.altText ?? null,
            width: image.width ?? null,
            height: image.height ?? null,
            sortOrder: image.sortOrder || index,
            isPrimary: image.isPrimary || index === 0,
          })),
        })
      }

      await tx.adminAuditLog.create({
        data: {
          userId: actorId,
          action: input.id ? 'product.update' : 'product.create',
          entityType: 'Product',
          entityId: product.id,
          afterJson: { name: product.name, slug: product.slug, status: product.status },
        },
      })

      return product.id
    })

    await catalogService.syncProductAggregates(productId)
    return { id: productId }
  },
}
