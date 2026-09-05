import pino from 'pino'
import { env } from '@/lib/env'

/**
 * Structured logs: JSON in production (so Vercel/Sentry can index them),
 * human-readable in development.
 */
export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  base: { service: 'vennzya' },
  redact: {
    paths: [
      'password',
      '*.password',
      'razorpaySignature',
      '*.razorpaySignature',
      'authorization',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[redacted]',
  },
  ...(env.NODE_ENV !== 'production'
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname,service' },
        },
      }
    : {}),
})

export type Logger = typeof logger
