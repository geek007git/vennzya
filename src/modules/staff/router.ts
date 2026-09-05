import { TRPCError } from '@trpc/server'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { protectedProcedure, requirePermission, router, staffProcedure } from '@/server/trpc/init'
import { PERMISSION_KEYS, PERMISSIONS, type PermissionKey } from './permissions'

const permissionKeySchema = z.enum(PERMISSION_KEYS as [PermissionKey, ...PermissionKey[]])

export const staffRouter = router({
  /** Drives the admin shell: who am I and what may I see? */
  me: protectedProcedure.query(async ({ ctx }) => {
    const isOwner = ctx.user.role === 'OWNER'

    const granted = isOwner
      ? PERMISSION_KEYS
      : (
          await ctx.db.staffPermission.findMany({
            where: { userId: ctx.user.id },
            select: { permissionKey: true },
          })
        ).map((row) => row.permissionKey as PermissionKey)

    return {
      id: ctx.user.id,
      name: ctx.user.name,
      email: ctx.user.email,
      role: ctx.user.role,
      isStaff: ctx.user.role === 'STAFF' || isOwner,
      permissions: granted,
    }
  }),

  list: requirePermission('staff.manage').query(({ ctx }) =>
    ctx.db.user.findMany({
      where: { role: { in: ['OWNER', 'STAFF'] } },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        banned: true,
        createdAt: true,
        permissions: { select: { permissionKey: true } },
      },
    }),
  ),

  permissionCatalog: staffProcedure.query(() =>
    PERMISSION_KEYS.map((key) => ({ key, description: PERMISSIONS[key] })),
  ),

  /**
   * Staff are invited, never handed a password by the owner — that's what
   * keeps the master credential from being shared around.
   */
  invite: requirePermission('staff.manage')
    .input(
      z.object({
        email: z.string().trim().email(),
        permissions: z.array(permissionKeySchema).min(1, 'Grant at least one permission'),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await ctx.db.user.findUnique({
        where: { email: input.email },
        select: { id: true, role: true },
      })

      if (existing && existing.role !== 'CUSTOMER') {
        throw new TRPCError({ code: 'CONFLICT', message: 'That person already has staff access.' })
      }

      const invite = await ctx.db.staffInvite.create({
        data: {
          email: input.email,
          token: nanoid(40),
          role: 'STAFF',
          permissions: input.permissions,
          invitedById: ctx.user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        select: { id: true, token: true, email: true, expiresAt: true },
      })

      await ctx.db.adminAuditLog.create({
        data: {
          userId: ctx.user.id,
          action: 'staff.invite',
          entityType: 'StaffInvite',
          entityId: invite.id,
          afterJson: { email: input.email, permissions: input.permissions },
        },
      })

      logger.info({ email: input.email }, 'staff invited')
      return invite
    }),

  setPermissions: requirePermission('staff.manage')
    .input(
      z.object({
        userId: z.string(),
        permissions: z.array(permissionKeySchema),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You can’t change your own permissions.',
        })
      }

      const target = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: { role: true },
      })

      if (target?.role === 'OWNER') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'The owner always has full access.' })
      }

      await ctx.db.$transaction([
        ctx.db.staffPermission.deleteMany({ where: { userId: input.userId } }),
        ctx.db.staffPermission.createMany({
          data: input.permissions.map((permissionKey) => ({
            userId: input.userId,
            permissionKey,
          })),
        }),
        ctx.db.adminAuditLog.create({
          data: {
            userId: ctx.user.id,
            action: 'staff.setPermissions',
            entityType: 'User',
            entityId: input.userId,
            afterJson: { permissions: input.permissions },
          },
        }),
      ])

      return { updated: true }
    }),

  setAccess: requirePermission('staff.manage')
    .input(z.object({ userId: z.string(), banned: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'You can’t revoke your own access.' })
      }

      const target = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: { role: true },
      })

      if (target?.role === 'OWNER') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'The owner’s access can’t be revoked.' })
      }

      await ctx.db.user.update({
        where: { id: input.userId },
        data: { banned: input.banned },
      })

      // Revoking access must end live sessions, not just block the next login.
      if (input.banned) {
        await ctx.db.session.deleteMany({ where: { userId: input.userId } })
      }

      await ctx.db.adminAuditLog.create({
        data: {
          userId: ctx.user.id,
          action: input.banned ? 'staff.revokeAccess' : 'staff.restoreAccess',
          entityType: 'User',
          entityId: input.userId,
        },
      })

      return { banned: input.banned }
    }),

  auditLog: requirePermission('staff.manage')
    .input(z.object({ limit: z.number().int().min(1).max(100).default(50) }))
    .query(({ input, ctx }) =>
      ctx.db.adminAuditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: input.limit,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
        },
      }),
    ),
})
