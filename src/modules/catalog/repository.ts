import type { Prisma } from '@/generated/prisma/client'
import { db } from '@/server/db'
import type { ProductListInput } from './schema'

/**
 * The only place Catalogue tables are queried. Everything above this file
 * works with the shapes returned here, so a schema change has one blast radius.
 */

export const productCardSelect = {
  id: true,
  name: true,
  slug: true,
  shortDescription: true,
  minPrice: true,
  maxPrice: true,
  totalStock: true,
  isFeatured: true,
  images: {
    where: { variantId: null },
    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
    take: 2,
    select: { url: true, altText: true, blurDataUrl: true, width: true, height: true },
  },
  variants: {
    where: { isActive: true },
    select: { id: true, price: true, compareAtPrice: true, stockQuantity: true },
    orderBy: { price: 'asc' },
    take: 1,
  },
  categories: {
    take: 1,
    select: { category: { select: { name: true, slug: true } } },
  },
} satisfies Prisma.ProductSelect

export type ProductCard = Prisma.ProductGetPayload<{ select: typeof productCardSelect }>

export const productDetailSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  shortDescription: true,
  brand: true,
  careInstructions: true,
  hsnCode: true,
  gstRatePercent: true,
  minPrice: true,
  maxPrice: true,
  totalStock: true,
  seoTitle: true,
  seoDescription: true,
  publishedAt: true,
  images: {
    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
    select: {
      id: true,
      url: true,
      altText: true,
      blurDataUrl: true,
      width: true,
      height: true,
      variantId: true,
    },
  },
  categories: { select: { category: { select: { id: true, name: true, slug: true } } } },
  options: {
    orderBy: { sortOrder: 'asc' },
    select: {
      option: {
        select: {
          id: true,
          name: true,
          isSwatch: true,
          values: { orderBy: { sortOrder: 'asc' }, select: { id: true, value: true, swatchHex: true } },
        },
      },
    },
  },
  variants: {
    where: { isActive: true },
    orderBy: { price: 'asc' },
    select: {
      id: true,
      sku: true,
      price: true,
      compareAtPrice: true,
      stockQuantity: true,
      lowStockThreshold: true,
      optionValues: {
        select: {
          optionValue: {
            select: { id: true, value: true, optionId: true, option: { select: { name: true } } },
          },
        },
      },
    },
  },
} satisfies Prisma.ProductSelect

export type ProductDetail = Prisma.ProductGetPayload<{ select: typeof productDetailSelect }>

function buildWhere(input: ProductListInput): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [{ status: 'ACTIVE' }]

  if (input.q) {
    and.push({
      OR: [
        { name: { contains: input.q, mode: 'insensitive' } },
        { description: { contains: input.q, mode: 'insensitive' } },
        { brand: { contains: input.q, mode: 'insensitive' } },
        { variants: { some: { sku: { contains: input.q, mode: 'insensitive' } } } },
      ],
    })
  }

  if (input.category) {
    and.push({
      categories: {
        some: {
          category: {
            OR: [{ slug: input.category }, { parent: { slug: input.category } }],
          },
        },
      },
    })
  }

  if (input.collection) {
    and.push({ collections: { some: { collection: { slug: input.collection } } } })
  }

  if (input.featuredOnly) and.push({ isFeatured: true })
  if (input.inStockOnly) and.push({ totalStock: { gt: 0 } })

  if (input.minPrice !== undefined) and.push({ maxPrice: { gte: input.minPrice } })
  if (input.maxPrice !== undefined) and.push({ minPrice: { lte: input.maxPrice } })

  // Each option axis narrows further (Size AND Colour); values within an axis widen (M OR L).
  for (const [optionName, values] of Object.entries(input.options ?? {})) {
    if (values.length === 0) continue
    and.push({
      variants: {
        some: {
          isActive: true,
          optionValues: {
            some: {
              optionValue: {
                value: { in: values, mode: 'insensitive' },
                option: { name: { equals: optionName, mode: 'insensitive' } },
              },
            },
          },
        },
      },
    })
  }

  return { AND: and }
}

function buildOrderBy(sort: ProductListInput['sort']): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case 'price-asc':
      return [{ minPrice: 'asc' }, { id: 'asc' }]
    case 'price-desc':
      return [{ minPrice: 'desc' }, { id: 'asc' }]
    case 'name-asc':
      return [{ name: 'asc' }, { id: 'asc' }]
    default:
      return [{ publishedAt: 'desc' }, { id: 'asc' }]
  }
}

export const catalogRepository = {
  async listProducts(input: ProductListInput) {
    const rows = await db.product.findMany({
      where: buildWhere(input),
      select: productCardSelect,
      orderBy: buildOrderBy(input.sort),
      take: input.limit + 1,
      ...(input.cursor
        ? { cursor: { id: input.cursor }, skip: 1 }
        : { skip: (input.page - 1) * input.limit }),
    })

    const hasMore = rows.length > input.limit
    const items = hasMore ? rows.slice(0, input.limit) : rows

    return { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null }
  },

  countProducts(input: ProductListInput) {
    return db.product.count({ where: buildWhere(input) })
  },

  findProductBySlug(slug: string) {
    return db.product.findFirst({
      where: { slug, status: 'ACTIVE' },
      select: productDetailSelect,
    })
  },

  findRelatedProducts(productId: string, categoryIds: string[], limit = 4) {
    return db.product.findMany({
      where: {
        status: 'ACTIVE',
        id: { not: productId },
        categories: { some: { categoryId: { in: categoryIds } } },
      },
      select: productCardSelect,
      orderBy: { publishedAt: 'desc' },
      take: limit,
    })
  },

  listActiveCategories() {
    return db.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        parentId: true,
        _count: { select: { products: { where: { product: { status: 'ACTIVE' } } } } },
      },
    })
  },

  findCategoryBySlug(slug: string) {
    return db.category.findFirst({
      where: { slug, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        seoTitle: true,
        seoDescription: true,
        parent: { select: { name: true, slug: true } },
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: { id: true, name: true, slug: true, imageUrl: true },
        },
      },
    })
  },

  /** Powers the filter sidebar: only axes that actually exist in the catalogue. */
  listFilterFacets() {
    return db.option.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        isSwatch: true,
        values: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, value: true, swatchHex: true },
        },
      },
    })
  },

  async priceBounds() {
    const result = await db.product.aggregate({
      where: { status: 'ACTIVE' },
      _min: { minPrice: true },
      _max: { maxPrice: true },
    })
    return {
      min: Number(result._min.minPrice ?? 0),
      max: Number(result._max.maxPrice ?? 0),
    }
  },

  listCollections() {
    return db.collection.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, title: true, slug: true, description: true, imageUrl: true },
    })
  },

  findCollectionBySlug(slug: string, limit = 12) {
    return db.collection.findFirst({
      where: { slug, isActive: true },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        imageUrl: true,
        products: {
          orderBy: { sortOrder: 'asc' },
          take: limit,
          select: { product: { select: productCardSelect } },
        },
      },
    })
  },
}
