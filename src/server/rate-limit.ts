import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { env } from '@/lib/env'
import { integrations } from '@/lib/integrations'

/**
 * Upstash in production (serverless instances share no memory, so an
 * in-process counter would be trivially bypassed by hitting another lambda).
 * Falls back to an in-memory limiter locally so dev needs no vendor account.
 */

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: Date
}

type Limiter = (identifier: string) => Promise<RateLimitResult>

const redis = integrations.upstash
  ? new Redis({
      url: env.UPSTASH_REDIS_REST_URL as string,
      token: env.UPSTASH_REDIS_REST_TOKEN as string,
    })
  : null

function inMemoryLimiter(limit: number, windowMs: number): Limiter {
  const hits = new Map<string, { count: number; resetAt: number }>()

  return async (identifier) => {
    const now = Date.now()
    const entry = hits.get(identifier)

    if (!entry || entry.resetAt <= now) {
      const resetAt = now + windowMs
      hits.set(identifier, { count: 1, resetAt })
      return { success: true, remaining: limit - 1, resetAt: new Date(resetAt) }
    }

    entry.count += 1
    return {
      success: entry.count <= limit,
      remaining: Math.max(0, limit - entry.count),
      resetAt: new Date(entry.resetAt),
    }
  }
}

function createLimiter(prefix: string, limit: number, window: `${number} ${'s' | 'm' | 'h'}`) {
  if (!redis) {
    const windowMs = parseWindowMs(window)
    return inMemoryLimiter(limit, windowMs)
  }

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: true,
    prefix: `vennzya:${prefix}`,
  })

  return async (identifier: string): Promise<RateLimitResult> => {
    const result = await limiter.limit(identifier)
    return { success: result.success, remaining: result.remaining, resetAt: new Date(result.reset) }
  }
}

function parseWindowMs(window: string): number {
  const [amount, unit] = window.split(' ') as [string, string]
  const n = Number(amount)
  if (unit.startsWith('h')) return n * 60 * 60 * 1000
  if (unit.startsWith('m')) return n * 60 * 1000
  return n * 1000
}

export const rateLimiters = {
  /** OTP costs real money per SMS and is the classic abuse target. */
  otpRequest: createLimiter('otp', 5, '15 m'),
  login: createLimiter('login', 10, '15 m'),
  checkout: createLimiter('checkout', 20, '10 m'),
  couponValidate: createLimiter('coupon', 30, '10 m'),
  contactForm: createLimiter('contact', 5, '1 h'),
} as const
