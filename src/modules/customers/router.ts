import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { toNumber } from '@/lib/money'
import { requirePermission, router } from '@/server/trpc/init'

/**
 * Read-only by design. Staff can see who ordered what in order to support
 * them; nobody edits customer records from here, so there is no way to
 * quietly alter someone's details.
 */
export const customersRouter = router({
  list: requirePermission('customers.view')
    .input(
      z.object({
        q: z.string().trim().max(80).optional(),
        limit: z.number().int().min(1).max(100).default(25),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const rows = await ctx.db.user.findMany({
        where: {
          role: 'CUSTOMER',
          ...(input.q
            ? {
                OR: [
                  { name: { contains: input.q, mode: 'insensitive' as const } },
                  { email: { contains: input.q, mode: 'insensitive' as const } },
                  { phoneNumber: { contains: input.q } },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          createdAt: true,
          orders: {
            where: { status: { not: 'CANCELLED' } },
            select: { totalAmount: true, placedAt: true },
          },
        },
      })

      const hasMore = rows.length > input.limit
      const items = hasMore ? rows.slice(0, input.limit) : rows

      return {
        items: items.map((customer) => ({
          id: customer.id,
          name: customer.name,
          email: customer.email?.endsWith('@phone.vennzya.local') ? null : customer.email,
          phoneNumber: customer.phoneNumber,
          createdAt: customer.createdAt,
          orderCount: customer.orders.length,
          lifetimeValue: customer.orders.reduce(
            (sum, order) => sum + toNumber(order.totalAmount.toString()),
            0,
          ),
          lastOrderAt:
            customer.orders
              .map((order) => order.placedAt)
              .sort((a, b) => b.getTime() - a.getTime())[0] ?? null,
        })),
        nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
      }
    }),

  byId: requirePermission('customers.view')
    .input(z.object({ customerId: z.string() }))
    .query(async ({ input, ctx }) => {
      const customer = await ctx.db.user.findUnique({
        where: { id: input.customerId },
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          createdAt: true,
          addresses: {
            select: {
              id: true,
              label: true,
              fullName: true,
              phone: true,
              line1: true,
              line2: true,
              city: true,
              state: true,
              postalCode: true,
              isDefault: true,
            },
          },
          orders: {
            orderBy: { placedAt: 'desc' },
            take: 50,
            select: {
              id: true,
              orderNumber: true,
              status: true,
              paymentStatus: true,
              shippingStatus: true,
              paymentMethod: true,
              totalAmount: true,
              placedAt: true,
              _count: { select: { items: true } },
            },
          },
        },
      })

      if (!customer) throw new TRPCError({ code: 'NOT_FOUND', message: 'Customer not found.' })

      const orders = customer.orders.map((order) => ({
        ...order,
        totalAmount: toNumber(order.totalAmount.toString()),
      }))

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email?.endsWith('@phone.vennzya.local') ? null : customer.email,
        phoneNumber: customer.phoneNumber,
        createdAt: customer.createdAt,
        addresses: customer.addresses,
        orders,
        orderCount: orders.filter((order) => order.status !== 'CANCELLED').length,
        lifetimeValue: orders
          .filter((order) => order.status !== 'CANCELLED')
          .reduce((sum, order) => sum + order.totalAmount, 0),
      }
    }),
})
