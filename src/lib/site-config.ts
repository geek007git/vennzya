/**
 * Brand facts used across pages, SEO and footers.
 *
 * Reads `process.env.NEXT_PUBLIC_*` directly rather than importing the
 * validated `env` object: this module is pulled into client components, and
 * Next inlines NEXT_PUBLIC_ values at build time so nothing server-side leaks.
 */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '919000000000'

export const siteConfig = {
  name: 'Vennzya Fashion Hub',
  shortName: 'Vennzya',
  tagline: 'Timeless pieces, thoughtfully chosen',
  description:
    'Vennzya Fashion Hub curates women’s clothing, jewellery and fashion accessories for the modern Indian wardrobe — considered design, honest quality and secure delivery across India.',
  url: APP_URL,
  locale: 'en_IN',
  currency: 'INR',
  email: 'hello@vennzya.in',
  whatsappNumber: WHATSAPP_NUMBER,
  social: {
    whatsapp: `https://wa.me/${WHATSAPP_NUMBER}`,
    youtube: 'https://youtube.com/@vennzya',
    instagram: 'https://instagram.com/vennzya',
  },
  freeShippingThreshold: 1499,
  returnWindowDays: 7,
  supportHours: 'Mon–Sat, 10am – 7pm IST',
} as const

export function whatsappLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}
