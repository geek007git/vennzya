import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { phoneNumber } from 'better-auth/plugins'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import { smsChannel } from '@/modules/notifications/channels/sms'
import { db } from '@/server/db'

/**
 * One identity table for everyone; `role` separates shoppers from staff.
 *   shoppers → phone + OTP (optional: guest checkout never touches auth)
 *   staff    → email + password, sessions revocable from the Session table
 */
export const auth = betterAuth({
  appName: 'Vennzya Fashion Hub',
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.NEXT_PUBLIC_APP_URL,

  database: prismaAdapter(db, { provider: 'postgresql' }),

  // Staff only. Shoppers never see a password field.
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 10,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'CUSTOMER', input: false },
      banned: { type: 'boolean', defaultValue: false, input: false },
    },
  },

  advanced: {
    cookiePrefix: 'vennzya',
    useSecureCookies: env.NODE_ENV === 'production',
    defaultCookieAttributes: { sameSite: 'lax', httpOnly: true },
  },

  plugins: [
    phoneNumber({
      otpLength: 6,
      expiresIn: 5 * 60,
      allowedAttempts: 5,
      async sendOTP({ phoneNumber: to, code }) {
        await smsChannel.send({
          to,
          otp: code,
          body: `${code} is your Vennzya Fashion Hub verification code. It expires in 5 minutes.`,
        })
      },
      signUpOnVerification: {
        // Phone-first shoppers have no email; a placeholder keeps the unique
        // constraint satisfied until they add a real one at checkout.
        getTempEmail: (phone) => `${phone}@phone.vennzya.local`,
        getTempName: (phone) => phone,
      },
    }),
  ],

  onAPIError: {
    onError(error) {
      logger.error({ err: error }, 'better-auth error')
    },
  },
})

export type Auth = typeof auth
export type AuthSession = Auth['$Infer']['Session']
