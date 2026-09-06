import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { ReactNode } from 'react'
import { siteConfig } from '@/lib/site-config'

/**
 * Shared shell for every transactional email.
 *
 * Styles are inline objects rather than classes on purpose: Gmail, Outlook and
 * most Indian webmail clients strip `<style>` blocks, so anything that must
 * survive the trip has to ride on the element itself.
 */

export const brand = {
  background: '#f7f1e8',
  card: '#ffffff',
  border: '#e2d3c1',
  text: '#221810',
  muted: '#7a6047',
  accent: '#4a3728',
  success: '#2f6b4f',
} as const

const body = {
  backgroundColor: brand.background,
  color: brand.text,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  margin: 0,
  padding: '24px 0',
}

const container = {
  backgroundColor: brand.card,
  border: `1px solid ${brand.border}`,
  borderRadius: '12px',
  margin: '0 auto',
  maxWidth: '560px',
  padding: '32px',
}

const wordmark = {
  color: brand.accent,
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '0.24em',
  margin: 0,
  textTransform: 'uppercase' as const,
}

const footerText = {
  color: brand.muted,
  fontSize: '12px',
  lineHeight: '20px',
  margin: '0 0 4px',
}

export const heading = {
  color: brand.text,
  fontSize: '22px',
  fontWeight: 600,
  lineHeight: '30px',
  margin: '20px 0 8px',
}

export const paragraph = {
  color: brand.muted,
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 16px',
}

export const rule = { borderColor: brand.border, margin: '24px 0' }

export function EmailLayout({ children, preview }: { children: ReactNode; preview: string }) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Text style={wordmark}>{siteConfig.name}</Text>

          {children}

          <Hr style={rule} />

          <Section>
            <Text style={footerText}>
              Questions? Reply to this email or message us on{' '}
              <Link href={siteConfig.social.whatsapp} style={{ color: brand.accent }}>
                WhatsApp
              </Link>
              . We answer {siteConfig.supportHours}.
            </Text>
            <Text style={footerText}>
              {siteConfig.name} · {siteConfig.email}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
