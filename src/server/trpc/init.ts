import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { ZodError } from 'zod'
import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import type { PermissionKey } from '@/modules/staff/permissions'
import { db } from '@/server/db'

export interface CreateContextOptions {
  headers: Headers
}

export async function createTRPCContext({ headers }: CreateContextOptions) {
  const session = await auth.api.getSession({ headers })

  return {
    db,
    headers,
    session,
    user: session?.user ?? null,
    ip: headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
  }
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // Field-level messages the client can map straight onto form inputs.
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

export const createCallerFactory = t.createCallerFactory
export const router = t.router
export const middleware = t.middleware

/** Logs slow calls so a regression shows up before a customer reports it. */
const timing = t.middleware(async ({ next, path, type }) => {
  const start = Date.now()
  const result = await next()
  const durationMs = Date.now() - start

  if (!result.ok) {
    logger.warn({ path, type, durationMs, err: result.error }, 'trpc call failed')
  } else if (durationMs > 1000) {
    logger.warn({ path, type, durationMs }, 'slow trpc call')
  }

  return result
})

export const publicProcedure = t.procedure.use(timing)

/** Any signed-in identity (shopper or staff). */
export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Please sign in to continue.' })
  }
  if (ctx.user.banned) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'This account has been suspended.' })
  }
  return next({ ctx: { ...ctx, user: ctx.user } })
})

/** Any staff member. Individual capabilities still need requirePermission. */
export const staffProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'STAFF' && ctx.user.role !== 'OWNER') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Staff access required.' })
  }
  return next({ ctx })
})

/**
 * Authoritative capability check. Middleware at the edge only proves a cookie
 * is well-formed; this hits the database and is what actually protects data.
 */
export function requirePermission(permission: PermissionKey) {
  return staffProcedure.use(async ({ ctx, next }) => {
    if (ctx.user.role === 'OWNER') return next({ ctx })

    const granted = await ctx.db.staffPermission.findUnique({
      where: { userId_permissionKey: { userId: ctx.user.id, permissionKey: permission } },
      select: { userId: true },
    })

    if (!granted) {
      logger.warn({ userId: ctx.user.id, permission }, 'permission denied')
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `You do not have permission to ${permission.replace('.', ' ')}.`,
      })
    }

    return next({ ctx })
  })
}
