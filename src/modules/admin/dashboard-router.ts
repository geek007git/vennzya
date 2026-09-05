import { toNumber } from '@/lib/money'
import { requirePermission, router } from '@/server/trpc/init'

const startOfDay = (offsetDays = 0) => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - offsetDays)
  return date
}

export const dashboardRouter = router({
  /** The numbers the owner needs on a Monday morning, in one query round. */
  summary: requirePermission('orders.manage').query(async ({ ctx }) => {
    const today = startOfDay()
    const last30 = startOfDay(30)

    const [
      todayOrders,
      last30Revenue,
      pendingFulfilment,
      codAwaiting,
      lowStockCount,
      newContactCount,
      recentOrders,
    ] = await Promise.all([
      ctx.db.order.aggregate({
        where: { placedAt: { gte: today }, status: { not: 'CANCELLED' } },
        _count: true,
        _sum: { totalAmount: true },
      }),
      ctx.db.order.aggregate({
        where: {
          placedAt: { gte: last30 },
          status: { not: 'CANCELLED' },
          paymentStatus: { in: ['PAID', 'COD_COLLECTED', 'COD_PENDING'] },
        },
        _count: true,
        _sum: { totalAmount: true },
      }),
      ctx.db.order.count({
        where: {
          status: { in: ['CONFIRMED', 'PROCESSING'] },
          shippingStatus: { in: ['NOT_SHIPPED', 'PACKED'] },
        },
      }),
      ctx.db.order.count({ where: { paymentStatus: 'COD_PENDING' } }),
      ctx.db.productVariant.count({ where: { isActive: true, stockQuantity: { lte: 5 } } }),
      ctx.db.contactSubmission.count({ where: { status: 'NEW' } }),
      ctx.db.order.findMany({
        orderBy: { placedAt: 'desc' },
        take: 8,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          totalAmount: true,
          placedAt: true,
          user: { select: { name: true } },
        },
      }),
    ])

    return {
      today: {
        orders: todayOrders._count,
        revenue: toNumber(todayOrders._sum.totalAmount?.toString() ?? '0'),
      },
      last30Days: {
        orders: last30Revenue._count,
        revenue: toNumber(last30Revenue._sum.totalAmount?.toString() ?? '0'),
      },
      pendingFulfilment,
      codAwaiting,
      lowStockCount,
      newContactCount,
      recentOrders: recentOrders.map((order) => ({
        ...order,
        totalAmount: toNumber(order.totalAmount.toString()),
      })),
    }
  }),
})
