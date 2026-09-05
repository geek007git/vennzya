import { TRPCError } from '@trpc/server'
import { normalizePhone } from '@/lib/india'
import { logger } from '@/lib/logger'
import { publicProcedure, requirePermission, router } from '@/server/trpc/init'
import { rateLimiters } from '@/server/rate-limit'
import { contactListInput, contactStatusInput, contactSubmissionInput } from './schema'

export const supportRouter = router({
  submit: publicProcedure.input(contactSubmissionInput).mutation(async ({ input, ctx }) => {
    const limit = await rateLimiters.contactForm(ctx.ip)
    if (!limit.success) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'You’ve sent a few messages already. Please try again a little later.',
      })
    }

    const submission = await ctx.db.contactSubmission.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone ? normalizePhone(input.phone) : null,
        subject: input.subject ?? null,
        message: input.message,
      },
      select: { id: true },
    })

    logger.info({ submissionId: submission.id }, 'contact form submitted')

    return { id: submission.id }
  }),

  // ── Admin ───────────────────────────────────────────────────────────────
  list: requirePermission('support.manage')
    .input(contactListInput)
    .query(async ({ input, ctx }) => {
      const rows = await ctx.db.contactSubmission.findMany({
        where: input.status ? { status: input.status } : {},
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          subject: true,
          message: true,
          status: true,
          createdAt: true,
          respondedAt: true,
          respondedBy: { select: { name: true, email: true } },
        },
      })

      const hasMore = rows.length > input.limit
      const items = hasMore ? rows.slice(0, input.limit) : rows

      return { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null }
    }),

  updateStatus: requirePermission('support.manage')
    .input(contactStatusInput)
    .mutation(async ({ input, ctx }) => {
      const before = await ctx.db.contactSubmission.findUnique({
        where: { id: input.submissionId },
        select: { status: true },
      })

      if (!before) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'That message no longer exists.' })
      }

      const isHandled = input.status === 'RESOLVED' || input.status === 'IN_PROGRESS'

      const updated = await ctx.db.contactSubmission.update({
        where: { id: input.submissionId },
        data: {
          status: input.status,
          respondedById: isHandled ? ctx.user.id : null,
          respondedAt: isHandled ? new Date() : null,
        },
        select: { id: true, status: true },
      })

      await ctx.db.adminAuditLog.create({
        data: {
          userId: ctx.user.id,
          action: 'support.updateStatus',
          entityType: 'ContactSubmission',
          entityId: updated.id,
          beforeJson: before,
          afterJson: { status: updated.status },
        },
      })

      return updated
    }),
})
