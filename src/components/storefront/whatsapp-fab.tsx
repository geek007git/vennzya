'use client'

import { usePathname } from 'next/navigation'
import { WhatsAppIcon } from '@/components/ui/brand-icons'
import { siteConfig, whatsappLink } from '@/lib/site-config'

/**
 * Hidden on checkout: nothing should tempt a shopper away mid-payment.
 * Sits above the mobile sticky bar's safe area on product pages.
 */
const HIDDEN_ON = ['/checkout', '/admin']

export function WhatsAppFab() {
  const pathname = usePathname()

  if (HIDDEN_ON.some((path) => pathname.startsWith(path))) return null

  const onProductPage = pathname.startsWith('/products/')

  return (
    <a
      href={whatsappLink(`Hi ${siteConfig.shortName}! I have a question.`)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className={`fixed right-4 z-30 inline-flex size-13 items-center justify-center rounded-full bg-[#25D366] text-white shadow-card transition-transform duration-200 ease-[var(--ease-out-soft)] hover:scale-105 sm:right-6 ${
        onProductPage ? 'bottom-24 lg:bottom-6' : 'bottom-5 sm:bottom-6'
      }`}
    >
      <WhatsAppIcon className="size-6" />
    </a>
  )
}
