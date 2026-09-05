import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { toNumber } from '@/lib/money'
import { requirePermission, router } from '@/server/trpc/init'
import { adjustStockInput, categoryUpsertInput } from './schema'
import { catalogService } from './service'

/**
 * Admin-side catalogue operations. Kept separate from the public catalogue
 * router so a permission check can never be forgotten on a storefront edit.
 */
export const catalogAdminRouter = router({
  products: requirePermission('products.manage')
    .input(
      z.object({
        q: z.string().trim().max(80).optional(),
        status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
        lowStockOnly: z.boolean().default(false),
        limit: z.number().int().min(1).max(100).default(25),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const rows = await ctx.db.product.findMany({
        where: {
          ...(input.status ? { status: input.status } : {}),
          ...(input.lowStockOnly ? { totalStock: { lte: 5 } } : {}),
          ...(input.q
            ? {
                OR: [
                  { name: { contains: input.q, mode: 'insensitive' as const } },
                  { variants: { some: { sku: { contains: input.q, mode: 'insensitive' as const } } } },
                ],
              }
            : {}),
        },
        orderBy: { updatedAt: 'desc' },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          minPrice: true,
          maxPrice: true,
          totalStock: true,
          isFeatured: true,
          updatedAt: true,
          images: {
            where: { variantId: null },
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
            take: 1,
            select: { url: true },
          },
          categories: { take: 1, select: { category: { select: { name: true } } } },
          _count: { select: { variants: true } },
        },
      })

      const hasMore = rows.length > input.limit
      const items = hasMore ? rows.slice(0, input.limit) : rows

      return {
        items: items.map((product) => ({
          id: product.id,
          name: product.name,
          slug: product.slug,
          status: product.status,
          minPrice: product.minPrice === null ? null : toNumber(product.minPrice.toString()),
          maxPrice: product.maxPrice === null ? null : toNumber(product.maxPrice.toString()),
          totalStock: product.totalStock,
          isFeatured: product.isFeatured,
          updatedAt: product.updatedAt,
          imageUrl: product.images[0]?.url ?? null,
          categoryName: product.categories[0]?.category.name ?? null,
          variantCount: product._count.variants,
        })),
        nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
      }
    }),

  /** Variant-level stock, which is what the owner actually restocks against. */
  stock: requirePermission('products.manage')
    .input(z.object({ lowStockOnly: z.boolean().default(false) }))
    .query(async ({ input, ctx }) => {
      const variants = await ctx.db.productVariant.findMany({
        where: { isActive: true },
        orderBy: [{ stockQuantity: 'asc' }, { sku: 'asc' }],
        take: 200,
        select: {
          id: true,
          sku: true,
          stockQuantity: true,
          lowStockThreshold: true,
          price: true,
          product: { select: { id: true, name: true, slug: true } },
          optionValues: {
            select: { optionValue: { select: { value: true, option: { select: { name: true } } } } },
          },
        },
      })

      return variants
        .filter((variant) => !input.lowStockOnly || variant.stockQuantity <= variant.lowStockThreshold)
        .map((variant) => ({
          id: variant.id,
          sku: variant.sku,
          stockQuantity: variant.stockQuantity,
          lowStockThreshold: variant.lowStockThreshold,
          price: toNumber(variant.price.toString()),
          productId: variant.product.id,
          productName: variant.product.name,
          productSlug: variant.product.slug,
          variantLabel: variant.optionValues
            .map((ov) => `${ov.optionValue.option.name} ${ov.optionValue.value}`)
            .join(' · '),
          isLow: variant.stockQuantity <= variant.lowStockThreshold,
        }))
    }),

  adjustStock: requirePermission('products.manage')
    .input(adjustStockInput)
    .mutation(async ({ input, ctx }) => {
      const variant = await ctx.db.productVariant.findUnique({
        where: { id: input.variantId },
        select: { id: true, stockQuantity: true, productId: true, sku: true },
      })

      if (!variant) throw new TRPCError({ code: 'NOT_FOUND', message: 'Variant not found.' })

      const resulting = variant.stockQuantity + input.quantityDelta
      if (resulting < 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `That would take ${variant.sku} below zero (currently ${variant.stockQuantity}).`,
        })
      }

      await ctx.db.$transaction([
        ctx.db.productVariant.update({
          where: { id: variant.id },
          data: { stockQuantity: resulting },
        }),
        ctx.db.stockMovement.create({
          data: {
            variantId: variant.id,
            type: input.quantityDelta > 0 ? 'RESTOCK' : 'ADJUSTMENT',
            quantityDelta: input.quantityDelta,
            resultingStock: resulting,
            createdById: ctx.user.id,
            note: input.note ?? null,
          },
        }),
        ctx.db.adminAuditLog.create({
          data: {
            userId: ctx.user.id,
            action: 'stock.adjust',
            entityType: 'ProductVariant',
            entityId: variant.id,
            beforeJson: { stockQuantity: variant.stockQuantity },
            afterJson: { stockQuantity: resulting },
          },
        }),
      ])

      await catalogService.syncProductAggregates(variant.productId)
      return { stockQuantity: resulting }
    }),

  setStatus: requirePermission('products.manage')
    .input(z.object({ productId: z.string(), status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']) }))
    .mutation(async ({ input, ctx }) => {
      const updated = await ctx.db.product.update({
        where: { id: input.productId },
        data: {
          status: input.status,
          publishedAt: input.status === 'ACTIVE' ? new Date() : null,
        },
        select: { id: true, status: true },
      })

      await ctx.db.adminAuditLog.create({
        data: {
          userId: ctx.user.id,
          action: 'product.setStatus',
          entityType: 'Product',
          entityId: input.productId,
          afterJson: { status: input.status },
        },
      })

      return updated
    }),

  categories: requirePermission('products.manage').query(({ ctx }) =>
    ctx.db.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        isActive: true,
        sortOrder: true,
        _count: { select: { products: true } },
      },
    }),
  ),

  upsertCategory: requirePermission('products.manage')
    .input(categoryUpsertInput)
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input
      const payload = {
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        imageUrl: data.imageUrl ?? null,
        parentId: data.parentId ?? null,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
      }

      return id
        ? ctx.db.category.update({ where: { id }, data: payload })
        : ctx.db.category.create({ data: payload })
    }),

  options: requirePermission('products.manage').query(({ ctx }) =>
    ctx.db.option.findMany({
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
    }),
  ),
})
