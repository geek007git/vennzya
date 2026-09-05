import { Mail } from 'lucide-react'
import Link from 'next/link'
import { InstagramIcon, WhatsAppIcon, YouTubeIcon } from '@/components/ui/brand-icons'
import { siteConfig, whatsappLink } from '@/lib/site-config'

const COLUMNS = [
  {
    heading: 'Shop',
    links: [
      { href: '/shop', label: 'All products' },
      { href: '/shop/womens-clothing', label: 'Women’s clothing' },
      { href: '/shop/jewellery', label: 'Jewellery' },
      { href: '/shop/fashion-accessories', label: 'Accessories' },
    ],
  },
  {
    heading: 'Help',
    links: [
      { href: '/contact', label: 'Contact us' },
      { href: '/faq', label: 'FAQ' },
      { href: '/policies/shipping', label: 'Shipping & delivery' },
      { href: '/policies/returns', label: 'Returns & refunds' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { href: '/about', label: 'About us' },
      { href: '/testimonials', label: 'Customer reviews' },
      { href: '/policies/privacy', label: 'Privacy policy' },
      { href: '/policies/terms', label: 'Terms & conditions' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-espresso-950 text-cream-100">
      <div className="container-page py-14 md:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <p className="font-display text-2xl font-extrabold tracking-tight text-cream-50">
              {siteConfig.shortName}
            </p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-cream-200/70">
              {siteConfig.tagline}. Curated women’s clothing, jewellery and accessories, delivered
              across India.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <a
                href={siteConfig.social.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat with us on WhatsApp"
                className="inline-flex size-10 items-center justify-center rounded-full border border-cream-100/20 transition-colors hover:bg-cream-100/10"
              >
                <WhatsAppIcon className="size-4" />
              </a>
              <a
                href={siteConfig.social.youtube}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Vennzya on YouTube"
                className="inline-flex size-10 items-center justify-center rounded-full border border-cream-100/20 transition-colors hover:bg-cream-100/10"
              >
                <YouTubeIcon className="size-4" />
              </a>
              <a
                href={siteConfig.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Vennzya on Instagram"
                className="inline-flex size-10 items-center justify-center rounded-full border border-cream-100/20 transition-colors hover:bg-cream-100/10"
              >
                <InstagramIcon className="size-4" />
              </a>
              <a
                href={`mailto:${siteConfig.email}`}
                aria-label={`Email ${siteConfig.email}`}
                className="inline-flex size-10 items-center justify-center rounded-full border border-cream-100/20 transition-colors hover:bg-cream-100/10"
              >
                <Mail className="size-4" aria-hidden />
              </a>
            </div>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cream-200/60">
                {column.heading}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-cream-100/80 transition-colors hover:text-cream-50"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-cream-100/10 pt-6 text-xs text-cream-200/60 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>Secure payments via UPI, cards & netbanking</span>
            <a href={whatsappLink('Hi! I need help with an order.')} className="hover:text-cream-50">
              Support: {siteConfig.supportHours}
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
