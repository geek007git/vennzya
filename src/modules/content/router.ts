import { z } from 'zod'
import { db } from '@/server/db'
import { publicProcedure, requirePermission, router } from '@/server/trpc/init'

const contentPageUpdateInput = z.object({
  pageKey: z.enum(['privacy', 'terms', 'shipping', 'returns', 'about']),
  title: z.string().trim().min(2).max(120),
  bodyMarkdown: z.string().trim().min(20).max(60_000),
  seoTitle: z.string().trim().max(70).nullable().optional(),
  seoDescription: z.string().trim().max(180).nullable().optional(),
})

export const contentRouter = router({
  testimonials: publicProcedure
    .input(
      z.object({
        featuredOnly: z.boolean().default(false),
        limit: z.number().int().min(1).max(24).default(12),
      }),
    )
    .query(({ input }) =>
      db.testimonial.findMany({
        where: { isApproved: true, ...(input.featuredOnly ? { isFeatured: true } : {}) },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        take: input.limit,
        select: {
          id: true,
          authorName: true,
          location: true,
          body: true,
          rating: true,
          imageUrl: true,
        },
      }),
    ),

  faq: publicProcedure.query(() =>
    db.faqItem.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, question: true, answer: true, category: true },
    }),
  ),

  page: publicProcedure.input(z.object({ pageKey: z.string() })).query(({ input }) =>
    db.contentPage.findUnique({
      where: { pageKey: input.pageKey },
      select: {
        pageKey: true,
        title: true,
        bodyMarkdown: true,
        seoTitle: true,
        seoDescription: true,
        updatedAt: true,
      },
    }),
  ),

  banners: publicProcedure
    .input(
      z.object({
        placement: z.enum([
          'ANNOUNCEMENT_BAR',
          'HOMEPAGE_HERO',
          'HOMEPAGE_SECONDARY',
          'CATEGORY_TOP',
        ]),
      }),
    )
    .query(({ input }) => {
      const now = new Date()
      return db.promoBanner.findMany({
        where: {
          placement: input.placement,
          isActive: true,
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          ],
        },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          title: true,
          subtitle: true,
          imageUrl: true,
          linkUrl: true,
          ctaLabel: true,
        },
      })
    }),

  // ── Admin ───────────────────────────────────────────────────────────────
  updatePage: requirePermission('content.manage')
    .input(contentPageUpdateInput)
    .mutation(async ({ input, ctx }) => {
      const { pageKey, ...data } = input
      return ctx.db.contentPage.upsert({
        where: { pageKey },
        create: {
          pageKey,
          title: data.title,
          bodyMarkdown: data.bodyMarkdown,
          seoTitle: data.seoTitle ?? null,
          seoDescription: data.seoDescription ?? null,
          updatedById: ctx.user.id,
        },
        update: {
          title: data.title,
          bodyMarkdown: data.bodyMarkdown,
          seoTitle: data.seoTitle ?? null,
          seoDescription: data.seoDescription ?? null,
          updatedById: ctx.user.id,
        },
      })
    }),
})
