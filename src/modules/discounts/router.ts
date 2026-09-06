import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { toNumber } from '@/lib/money'
import { requirePermission, router } from '@/server/trpc/init'

const couponUpsertInput = z
  .object({
    id: z.string().optional(),
    code: z
      .string()
      .trim()
      .min(3, 'Codes are at least 3 characters')
      .max(40)
      .regex(/^[A-Z0-9][A-Z0-9_-]*$/, 'Uppercase letters, digits, dashes and underscores only'),
    description: z.string().trim().max(200).nullable().optional(),
    type: z.enum(['PERCENTAGE', 'FLAT']),
    value: z.number().positive('Enter a value above zero'),
    minOrderValue: z.number().min(0).nullable().optional(),
    maxDiscountAmount: z.number().min(0).nullable().optional(),
    startsAt: z.date().nullable().optional(),
    expiresAt: z.date().nullable().optional(),
    usageLimitTotal: z.number().int().min(1).nullable().optional(),
    usageLimitPerCustomer: z.number().int().min(1).nullable().optional(),
    isActive: z.boolean().default(true),
  })
  .refine((input) => input.type !== 'PERCENTAGE' || input.value <= 100, {
    message: 'A percentage discount cannot exceed 100',
    path: ['value'],
  })
  .refine((input) => !input.startsAt || !input.expiresAt || input.startsAt < input.expiresAt, {
    message: 'The end date must come after the start date',
    path: ['expiresAt'],
  })

export const discountsRouter = router({
  list: requirePermission('discounts.manage')
    .input(
      z.object({
        includeInactive: z.boolean().default(true),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ input, ctx }) => {
      const coupons = await ctx.db.coupon.findMany({
        where: input.includeInactive ? {} : { isActive: true },
        orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
        take: input.limit,
        select: {
          id: true,
          code: true,
          description: true,
          type: true,
          value: true,
          minOrderValue: true,
          maxDiscountAmount: true,
          startsAt: true,
          expiresAt: true,
          usageLimitTotal: true,
          usageLimitPerCustomer: true,
          usedCount: true,
          isActive: true,
          createdAt: true,
          _count: { select: { redemptions: true } },
        },
      })

      const now = new Date()

      return coupons.map((coupon) => ({
        ...coupon,
        value: toNumber(coupon.value.toString()),
        minOrderValue:
          coupon.minOrderValue === null ? null : toNumber(coupon.minOrderValue.toString()),
        maxDiscountAmount:
          coupon.maxDiscountAmount === null ? null : toNumber(coupon.maxDiscountAmount.toString()),
        redemptions: coupon._count.redemptions,
        // What the shopper effectively sees, not just the isActive flag.
        isLive:
          coupon.isActive &&
          (!coupon.startsAt || coupon.startsAt <= now) &&
          (!coupon.expiresAt || coupon.expiresAt >= now) &&
          (coupon.usageLimitTotal === null || coupon.usedCount < coupon.usageLimitTotal),
      }))
    }),

  byId: requirePermission('discounts.manage')
    .input(z.object({ couponId: z.string() }))
    .query(async ({ input, ctx }) => {
      const coupon = await ctx.db.coupon.findUnique({
        where: { id: input.couponId },
        select: {
          id: true,
          code: true,
          description: true,
          type: true,
          value: true,
          minOrderValue: true,
          maxDiscountAmount: true,
          startsAt: true,
          expiresAt: true,
          usageLimitTotal: true,
          usageLimitPerCustomer: true,
          usedCount: true,
          isActive: true,
        },
      })

      if (!coupon) throw new TRPCError({ code: 'NOT_FOUND', message: 'Coupon not found.' })

      return {
        ...coupon,
        value: toNumber(coupon.value.toString()),
        minOrderValue:
          coupon.minOrderValue === null ? null : toNumber(coupon.minOrderValue.toString()),
        maxDiscountAmount:
          coupon.maxDiscountAmount === null ? null : toNumber(coupon.maxDiscountAmount.toString()),
      }
    }),

  upsert: requirePermission('discounts.manage')
    .input(couponUpsertInput)
    .mutation(async ({ input, ctx }) => {
      const existing = await ctx.db.coupon.findUnique({
        where: { code: input.code },
        select: { id: true },
      })

      if (existing && existing.id !== input.id) {
        throw new TRPCError({ code: 'CONFLICT', message: 'That code is already in use.' })
      }

      const data = {
        code: input.code,
        description: input.description ?? null,
        type: input.type,
        value: input.value,
        minOrderValue: input.minOrderValue ?? null,
        maxDiscountAmount: input.maxDiscountAmount ?? null,
        startsAt: input.startsAt ?? null,
        expiresAt: input.expiresAt ?? null,
        usageLimitTotal: input.usageLimitTotal ?? null,
        usageLimitPerCustomer: input.usageLimitPerCustomer ?? null,
        isActive: input.isActive,
      }

      const coupon = input.id
        ? await ctx.db.coupon.update({ where: { id: input.id }, data })
        : await ctx.db.coupon.create({ data: { ...data, createdById: ctx.user.id } })

      await ctx.db.adminAuditLog.create({
        data: {
          userId: ctx.user.id,
          action: input.id ? 'coupon.update' : 'coupon.create',
          entityType: 'Coupon',
          entityId: coupon.id,
          afterJson: { code: coupon.code, type: coupon.type, isActive: coupon.isActive },
        },
      })

      return { id: coupon.id, code: coupon.code }
    }),

  setActive: requirePermission('discounts.manage')
    .input(z.object({ couponId: z.string(), isActive: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const coupon = await ctx.db.coupon.update({
        where: { id: input.couponId },
        data: { isActive: input.isActive },
        select: { id: true, code: true, isActive: true },
      })

      await ctx.db.adminAuditLog.create({
        data: {
          userId: ctx.user.id,
          action: input.isActive ? 'coupon.activate' : 'coupon.deactivate',
          entityType: 'Coupon',
          entityId: coupon.id,
          afterJson: { code: coupon.code, isActive: coupon.isActive },
        },
      })

      return coupon
    }),

  /**
   * Coupons are never deleted once redeemed — an order references the code,
   * and the redemption history is part of the sales record.
   */
  remove: requirePermission('discounts.manage')
    .input(z.object({ couponId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const redemptions = await ctx.db.couponRedemption.count({
        where: { couponId: input.couponId },
      })

      if (redemptions > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `This coupon has been used ${redemptions} time${redemptions === 1 ? '' : 's'}. Deactivate it instead so the order history stays intact.`,
        })
      }

      await ctx.db.coupon.delete({ where: { id: input.couponId } })

      await ctx.db.adminAuditLog.create({
        data: {
          userId: ctx.user.id,
          action: 'coupon.delete',
          entityType: 'Coupon',
          entityId: input.couponId,
        },
      })

      return { deleted: true }
    }),
})
