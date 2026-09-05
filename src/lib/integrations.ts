import 'server-only'

import { env } from '@/lib/env'

/**
 * Which vendor integrations are actually configured. Server-only: reading
 * these keys from a client bundle would throw (and leak intent), so anything
 * the browser needs to know must be passed down as a prop instead.
 */
export const integrations = {
  razorpay: Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET),
  resend: Boolean(env.RESEND_API_KEY),
  msg91: Boolean(env.MSG91_AUTH_KEY && env.MSG91_OTP_TEMPLATE_ID),
  cloudinary: Boolean(
    env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
  ),
  upstash: Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN),
  sentry: Boolean(env.NEXT_PUBLIC_SENTRY_DSN),
} as const
