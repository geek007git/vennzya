import { Resend } from 'resend'
import { env } from '@/lib/env'
import { integrations } from '@/lib/integrations'
import { logger } from '@/lib/logger'

export interface EmailMessage {
  to: string
  subject: string
  html: string
  text: string
}

export interface EmailChannel {
  readonly name: string
  send(message: EmailMessage): Promise<void>
}

/** Dev/CI: no vendor account needed — Mailpit or the console is enough. */
const consoleEmail: EmailChannel = {
  name: 'console',
  async send({ to, subject }) {
    logger.info({ to, subject }, '[email:dev] not sent — RESEND_API_KEY is unset')
  },
}

const resendEmail: EmailChannel = {
  name: 'resend',
  async send({ html, subject, text, to }) {
    const client = new Resend(env.RESEND_API_KEY)

    const { error } = await client.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
      text,
    })

    if (error) {
      logger.error({ to, subject, error }, 'resend send failed')
      throw new Error(`Email delivery failed: ${error.message}`)
    }
  },
}

export const emailChannel: EmailChannel = integrations.resend ? resendEmail : consoleEmail
