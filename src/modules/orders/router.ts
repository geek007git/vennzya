import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { toNumber } from '@/lib/money'
import { notifications } from '@/modules/notifications/service'
import type { db } from '@/server/db'
import { protectedProcedure, publicProcedure, requirePermission, router } from '@/server/trpc/init'

const orderDetailSelect = {
  id: true,
  orderNumber: true,
  status: true,
  paymentStatus: true,
  shippingStatus: true,
  paymentMethod: true,
  subtotal: true,
  discountAmount: true,
  shippingFee: true,
  cgstAmount: true,
  sgstAmount: true,
  igstAmount: true,
  totalAmount: true,
  couponCodeSnapshot: true,
  contactEmail: true,
  contactPhone: true,
  customerNote: true,
  placedAt: true,
  confirmedAt: true,
  items: {
    select: {
      id: true,
      productNameSnapshot: true,
      productSlugSnapshot: true,
      skuSnapshot: true,
      imageUrlSnapshot: true,
      variantAttributesSnapshot: true,
      unitPrice: true,
      quantity: true,
      lineTotal: true,
    },
  },
  addresses: {
    select: {
      kind: true,
      fullName: true,
      phone: true,
      line1: true,
      line2: true,
      landmark: true,
      city: true,
      state: true,
      postalCode: true,
    },
  },
  tracking: {
    orderBy: { createdAt: 'desc' },
    select: {
      courierName: true,
      trackingNumber: true,
      trackingUrl: true,
      shippedAt: true,
      deliveredAt: true,
      estimatedDeliveryAt: true,
    },
  },
} as const

type OrderRow = Awaited<ReturnType<typeof db.order.findFirst<{ select: typeof orderDetailSelect }>>>

function serializeOrder(order: NonNullable<OrderRow>) {
  return {
    ...order,
    subtotal: toNumber(order.subtotal.toString()),
    discountAmount: toNumber(order.discountAmount.toString()),
    shippingFee: toNumber(order.shippingFee.toString()),
    cgstAmount: toNumber(order.cgstAmount.toString()),
    sgstAmount: toNumber(order.sgstAmount.toString()),
    igstAmount: toNumber(order.igstAmount.toString()),
    totalAmount: toNumber(order.totalAmount.toString()),
    items: order.items.map((item) => ({
      ...item,
      unitPrice: toNumber(item.unitPrice.toString()),
      lineTotal: toNumber(item.lineTotal.toString()),
      variantAttributesSnapshot: item.variantAttributesSnapshot as Record<string, string>,
    })),
  }
}

export const ordersRouter = router({
  /**
   * The confirmation page must work for guests, so a one-off token issued at
   * checkout stands in for a session. Signed-in owners can always read theirs.
   */
  byId: publicProcedure
    .input(z.object({ orderId: z.string().min(1), token: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const order = await ctx.db.order.findFirst({
        where: {
          id: input.orderId,
          OR: [
            ...(input.token ? [{ guestAccessToken: input.token }] : []),
            ...(ctx.user ? [{ userId: ctx.user.id }] : []),
          ],
        },
        select: orderDetailSelect,
      })

      if (!order) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'We could not find that order.' })
      }

      return serializeOrder(order)
    }),

  listMine: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }))
    .query(async ({ input, ctx }) => {
      const orders = await ctx.db.order.findMany({
        where: { userId: ctx.user.id },
        orderBy: { placedAt: 'desc' },
        take: input.limit,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          shippingStatus: true,
          totalAmount: true,
          placedAt: true,
          items: {
            take: 3,
            select: { productNameSnapshot: true, imageUrlSnapshot: true, quantity: true },
          },
          _count: { select: { items: true } },
        },
      })

      return orders.map((order) => ({
        ...order,
        totalAmount: toNumber(order.totalAmount.toString()),
      }))
    }),

  // ── Admin ───────────────────────────────────────────────────────────────
  adminList: requirePermission('orders.manage')
    .input(
      z.object({
        q: z.string().trim().max(80).optional(),
        status: z
          .enum(['CREATED', 'CONFIRMED', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REFUNDED'])
          .optional(),
        paymentStatus: z
          .enum([
            'PENDING',
            'PAID',
            'FAILED',
            'REFUNDED',
            'PARTIALLY_REFUNDED',
            'COD_PENDING',
            'COD_COLLECTED',
          ])
          .optional(),
        shippingStatus: z
          .enum([
            'NOT_SHIPPED',
            'PACKED',
            'SHIPPED',
            'OUT_FOR_DELIVERY',
            'DELIVERED',
            'RETURN_INITIATED',
            'RETURNED',
          ])
          .optional(),
        limit: z.number().int().min(1).max(100).default(25),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const rows = await ctx.db.order.findMany({
        where: {
          ...(input.status ? { status: input.status } : {}),
          ...(input.paymentStatus ? { paymentStatus: input.paymentStatus } : {}),
          ...(input.shippingStatus ? { shippingStatus: input.shippingStatus } : {}),
          ...(input.q
            ? {
                OR: [
                  { orderNumber: { contains: input.q, mode: 'insensitive' as const } },
                  { contactPhone: { contains: input.q } },
                  { contactEmail: { contains: input.q, mode: 'insensitive' as const } },
                ],
              }
            : {}),
        },
        orderBy: { placedAt: 'desc' },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          shippingStatus: true,
          paymentMethod: true,
          totalAmount: true,
          placedAt: true,
          contactPhone: true,
          user: { select: { name: true, email: true } },
          _count: { select: { items: true } },
        },
      })

      const hasMore = rows.length > input.limit
      const items = hasMore ? rows.slice(0, input.limit) : rows

      return {
        items: items.map((order) => ({
          ...order,
          totalAmount: toNumber(order.totalAmount.toString()),
        })),
        nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
      }
    }),

  adminById: requirePermission('orders.manage')
    .input(z.object({ orderId: z.string() }))
    .query(async ({ input, ctx }) => {
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId },
        select: {
          ...orderDetailSelect,
          adminNote: true,
          user: { select: { name: true, email: true, phoneNumber: true } },
        },
      })

      if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found.' })

      return { ...serializeOrder(order), adminNote: order.adminNote, customer: order.user }
    }),

  updateStatus: requirePermission('orders.manage')
    .input(
      z.object({
        orderId: z.string(),
        status: z
          .enum(['CREATED', 'CONFIRMED', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REFUNDED'])
          .optional(),
        shippingStatus: z
          .enum([
            'NOT_SHIPPED',
            'PACKED',
            'SHIPPED',
            'OUT_FOR_DELIVERY',
            'DELIVERED',
            'RETURN_INITIATED',
            'RETURNED',
          ])
          .optional(),
        adminNote: z.string().trim().max(1000).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const before = await ctx.db.order.findUnique({
        where: { id: input.orderId },
        select: { status: true, shippingStatus: true },
      })

      if (!before) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found.' })

      const updated = await ctx.db.order.update({
        where: { id: input.orderId },
        data: {
          ...(input.status ? { status: input.status } : {}),
          ...(input.shippingStatus ? { shippingStatus: input.shippingStatus } : {}),
          ...(input.adminNote !== undefined ? { adminNote: input.adminNote } : {}),
        },
        select: { id: true, orderNumber: true, status: true, shippingStatus: true },
      })

      await ctx.db.adminAuditLog.create({
        data: {
          userId: ctx.user.id,
          action: 'order.updateStatus',
          entityType: 'Order',
          entityId: updated.id,
          beforeJson: before,
          afterJson: { status: updated.status, shippingStatus: updated.shippingStatus },
        },
      })

      logger.info({ orderNumber: updated.orderNumber }, 'order status updated')
      return updated
    }),

  addTracking: requirePermission('orders.manage')
    .input(
      z.object({
        orderId: z.string(),
        courierName: z.string().trim().min(2).max(80),
        trackingNumber: z.string().trim().min(3).max(80),
        trackingUrl: z.string().url().optional(),
        estimatedDeliveryAt: z.date().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const tracking = await ctx.db.shipmentTracking.create({
        data: {
          orderId: input.orderId,
          courierName: input.courierName,
          trackingNumber: input.trackingNumber,
          trackingUrl: input.trackingUrl ?? null,
          estimatedDeliveryAt: input.estimatedDeliveryAt ?? null,
          shippedAt: new Date(),
        },
      })

      // Adding tracking means it has physically shipped; keep the two in step.
      await ctx.db.order.update({
        where: { id: input.orderId },
        data: { shippingStatus: 'SHIPPED', status: 'PROCESSING' },
      })

      await ctx.db.adminAuditLog.create({
        data: {
          userId: ctx.user.id,
          action: 'order.addTracking',
          entityType: 'Order',
          entityId: input.orderId,
          afterJson: { courierName: input.courierName, trackingNumber: input.trackingNumber },
        },
      })

      await notifications.orderShipped(input.orderId, {
        courierName: input.courierName,
        trackingNumber: input.trackingNumber,
        trackingUrl: input.trackingUrl ?? null,
      })

      return tracking
    }),

  markCodCollected: requirePermission('orders.manage')
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const order = await ctx.db.order.findUnique({
        where: { id: input.orderId },
        select: { paymentMethod: true, paymentStatus: true, orderNumber: true },
      })

      if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found.' })
      if (order.paymentMethod !== 'COD') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'That order was not a COD order.' })
      }
      if (order.paymentStatus === 'COD_COLLECTED') return { alreadyCollected: true }

      await ctx.db.$transaction([
        ctx.db.order.update({
          where: { id: input.orderId },
          data: { paymentStatus: 'COD_COLLECTED', status: 'COMPLETED' },
        }),
        ctx.db.payment.updateMany({
          where: { orderId: input.orderId },
          data: { status: 'COD_COLLECTED', verifiedAt: new Date() },
        }),
        ctx.db.adminAuditLog.create({
          data: {
            userId: ctx.user.id,
            action: 'order.markCodCollected',
            entityType: 'Order',
            entityId: input.orderId,
          },
        }),
      ])

      logger.info({ orderNumber: order.orderNumber }, 'COD payment recorded')
      return { alreadyCollected: false }
    }),
})
