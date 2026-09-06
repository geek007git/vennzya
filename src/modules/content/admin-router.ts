import { z } from 'zod'
import { requirePermission, router } from '@/server/trpc/init'

/**
 * Everything the owner can change about the shop's words and imagery without
 * a developer: banners, curated collections, testimonials and the FAQ.
 */

const bannerInput = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2).max(120),
  subtitle: z.string().trim().max(240).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  linkUrl: z.string().trim().max(300).nullable().optional(),
  ctaLabel: z.string().trim().max(40).nullable().optional(),
  placement: z.enum(['ANNOUNCEMENT_BAR', 'HOMEPAGE_HERO', 'HOMEPAGE_SECONDARY', 'CATEGORY_TOP']),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  startsAt: z.date().nullable().optional(),
  endsAt: z.date().nullable().optional(),
})

const testimonialInput = z.object({
  id: z.string().optional(),
  authorName: z.string().trim().min(2).max(80),
  location: z.string().trim().max(80).nullable().optional(),
  body: z.string().trim().min(10).max(1000),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  isApproved: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
})

const faqInput = z.object({
  id: z.string().optional(),
  question: z.string().trim().min(5).max(200),
  answer: z.string().trim().min(5).max(2000),
  category: z.string().trim().max(60).nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
})

const collectionInput = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, digits and dashes only'),
  description: z.string().trim().max(600).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
  productIds: z.array(z.string()).default([]),
})

const manage = requirePermission('content.manage')

export const contentAdminRouter = router({
  banners: manage.query(({ ctx }) =>
    ctx.db.promoBanner.findMany({ orderBy: [{ placement: 'asc' }, { sortOrder: 'asc' }] }),
  ),

  upsertBanner: manage.input(bannerInput).mutation(async ({ input, ctx }) => {
    const { id, ...rest } = input
    const data = {
      ...rest,
      subtitle: rest.subtitle ?? null,
      imageUrl: rest.imageUrl ?? null,
      linkUrl: rest.linkUrl ?? null,
      ctaLabel: rest.ctaLabel ?? null,
      startsAt: rest.startsAt ?? null,
      endsAt: rest.endsAt ?? null,
    }

    const banner = id
      ? await ctx.db.promoBanner.update({ where: { id }, data })
      : await ctx.db.promoBanner.create({ data })

    await ctx.db.adminAuditLog.create({
      data: {
        userId: ctx.user.id,
        action: id ? 'banner.update' : 'banner.create',
        entityType: 'PromoBanner',
        entityId: banner.id,
        afterJson: { title: banner.title, placement: banner.placement, isActive: banner.isActive },
      },
    })

    return banner
  }),

  deleteBanner: manage
    .input(z.object({ bannerId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.promoBanner.delete({ where: { id: input.bannerId } })
      await ctx.db.adminAuditLog.create({
        data: {
          userId: ctx.user.id,
          action: 'banner.delete',
          entityType: 'PromoBanner',
          entityId: input.bannerId,
        },
      })
      return { deleted: true }
    }),

  testimonials: manage.query(({ ctx }) =>
    ctx.db.testimonial.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] }),
  ),

  upsertTestimonial: manage.input(testimonialInput).mutation(async ({ input, ctx }) => {
    const { id, ...rest } = input
    const data = { ...rest, location: rest.location ?? null, rating: rest.rating ?? null }

    const testimonial = id
      ? await ctx.db.testimonial.update({ where: { id }, data })
      : await ctx.db.testimonial.create({ data })

    await ctx.db.adminAuditLog.create({
      data: {
        userId: ctx.user.id,
        action: id ? 'testimonial.update' : 'testimonial.create',
        entityType: 'Testimonial',
        entityId: testimonial.id,
      },
    })

    return testimonial
  }),

  deleteTestimonial: manage
    .input(z.object({ testimonialId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.testimonial.delete({ where: { id: input.testimonialId } })
      await ctx.db.adminAuditLog.create({
        data: {
          userId: ctx.user.id,
          action: 'testimonial.delete',
          entityType: 'Testimonial',
          entityId: input.testimonialId,
        },
      })
      return { deleted: true }
    }),

  faq: manage.query(({ ctx }) =>
    ctx.db.faqItem.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
  ),

  upsertFaq: manage.input(faqInput).mutation(async ({ input, ctx }) => {
    const { id, ...rest } = input
    const data = { ...rest, category: rest.category ?? null }

    const item = id
      ? await ctx.db.faqItem.update({ where: { id }, data })
      : await ctx.db.faqItem.create({ data })

    await ctx.db.adminAuditLog.create({
      data: {
        userId: ctx.user.id,
        action: id ? 'faq.update' : 'faq.create',
        entityType: 'FaqItem',
        entityId: item.id,
      },
    })

    return item
  }),

  deleteFaq: manage.input(z.object({ faqId: z.string() })).mutation(async ({ input, ctx }) => {
    await ctx.db.faqItem.delete({ where: { id: input.faqId } })
    await ctx.db.adminAuditLog.create({
      data: {
        userId: ctx.user.id,
        action: 'faq.delete',
        entityType: 'FaqItem',
        entityId: input.faqId,
      },
    })
    return { deleted: true }
  }),

  collections: manage.query(({ ctx }) =>
    ctx.db.collection.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        imageUrl: true,
        isActive: true,
        sortOrder: true,
        products: {
          orderBy: { sortOrder: 'asc' },
          select: { productId: true, product: { select: { name: true } } },
        },
      },
    }),
  ),

  upsertCollection: manage.input(collectionInput).mutation(async ({ input, ctx }) => {
    const { id, productIds, ...rest } = input
    const data = {
      ...rest,
      description: rest.description ?? null,
      imageUrl: rest.imageUrl ?? null,
    }

    const collection = await ctx.db.$transaction(async (tx) => {
      const saved = id
        ? await tx.collection.update({ where: { id }, data })
        : await tx.collection.create({ data })

      await tx.collectionProduct.deleteMany({ where: { collectionId: saved.id } })
      if (productIds.length) {
        await tx.collectionProduct.createMany({
          data: productIds.map((productId, index) => ({
            collectionId: saved.id,
            productId,
            sortOrder: index,
          })),
        })
      }

      return saved
    })

    await ctx.db.adminAuditLog.create({
      data: {
        userId: ctx.user.id,
        action: id ? 'collection.update' : 'collection.create',
        entityType: 'Collection',
        entityId: collection.id,
        afterJson: { title: collection.title, productCount: productIds.length },
      },
    })

    return collection
  }),

  deleteCollection: manage
    .input(z.object({ collectionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.collection.delete({ where: { id: input.collectionId } })
      await ctx.db.adminAuditLog.create({
        data: {
          userId: ctx.user.id,
          action: 'collection.delete',
          entityType: 'Collection',
          entityId: input.collectionId,
        },
      })
      return { deleted: true }
    }),

  /** Every policy page in one call, for the content editor's page list. */
  pages: manage.query(({ ctx }) =>
    ctx.db.contentPage.findMany({
      orderBy: { pageKey: 'asc' },
      select: { pageKey: true, title: true, bodyMarkdown: true, updatedAt: true },
    }),
  ),
})
