import { z } from 'zod'
import { publicProcedure, requirePermission, router } from '@/server/trpc/init'
import { catalogRepository } from './repository'
import {
  categoryBySlugInput,
  productBySlugInput,
  productListInput,
  productUpsertInput,
} from './schema'
import { catalogService, toProductCard } from './service'

export const catalogRouter = router({
  list: publicProcedure.input(productListInput).query(({ input }) => catalogService.listProducts(input)),

  count: publicProcedure.input(productListInput).query(({ input }) => catalogRepository.countProducts(input)),

  bySlug: publicProcedure
    .input(productBySlugInput)
    .query(({ input }) => catalogService.getProductBySlug(input.slug)),

  related: publicProcedure
    .input(z.object({ productId: z.string(), categoryIds: z.array(z.string()) }))
    .query(({ input }) => catalogService.getRelatedProducts(input.productId, input.categoryIds)),

  categories: publicProcedure.query(() => catalogRepository.listActiveCategories()),

  categoryBySlug: publicProcedure
    .input(categoryBySlugInput)
    .query(({ input }) => catalogRepository.findCategoryBySlug(input.slug)),

  facets: publicProcedure.query(async () => {
    const [options, priceBounds] = await Promise.all([
      catalogRepository.listFilterFacets(),
      catalogRepository.priceBounds(),
    ])
    return { options, priceBounds }
  }),

  collections: publicProcedure.query(() => catalogRepository.listCollections()),

  collectionBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ input }) => catalogService.getCollection(input.slug)),

  featured: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(24).default(8) }))
    .query(async ({ input }) => {
      const { items } = await catalogRepository.listProducts({
        featuredOnly: true,
        inStockOnly: false,
        sort: 'newest',
        limit: input.limit,
        page: 1,
      })
      return items.map(toProductCard)
    }),

  // ── Admin ───────────────────────────────────────────────────────────────
  upsert: requirePermission('products.manage')
    .input(productUpsertInput)
    .mutation(({ input, ctx }) => catalogService.upsertProduct(input, ctx.user.id)),
})
