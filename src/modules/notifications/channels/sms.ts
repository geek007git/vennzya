import { env } from '@/lib/env'
import { integrations } from '@/lib/integrations'
import { logger } from '@/lib/logger'

export interface SmsMessage {
  to: string
  body: string
  otp?: string
}

export interface SmsChannel {
  readonly name: string
  send(message: SmsMessage): Promise<void>
}

/** Dev/CI: no vendor account needed — the OTP lands in the server console. */
const consoleSms: SmsChannel = {
  name: 'console',
  async send({ to, body, otp }) {
    logger.info({ to, otp }, `[sms:dev] ${body}`)
  },
}

const msg91Sms: SmsChannel = {
  name: 'msg91',
  async send({ to, otp }) {
    const url = new URL('https://control.msg91.com/api/v5/otp')
    url.searchParams.set('template_id', env.MSG91_OTP_TEMPLATE_ID as string)
    url.searchParams.set('mobile', to)
    if (otp) url.searchParams.set('otp', otp)
    if (env.MSG91_SENDER_ID) url.searchParams.set('sender', env.MSG91_SENDER_ID)

    const response = await fetch(url, {
      method: 'POST',
      headers: { authkey: env.MSG91_AUTH_KEY as string, 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      const detail = await response.text()
      logger.error({ status: response.status, detail }, 'MSG91 send failed')
      throw new Error(`SMS delivery failed (${response.status})`)
    }
  },
}

export const smsChannel: SmsChannel = integrations.msg91 ? msg91Sms : consoleSms
