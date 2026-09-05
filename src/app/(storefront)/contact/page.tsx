import { Clock, Mail, MapPin } from 'lucide-react'
import type { Metadata } from 'next'
import { ContactForm } from '@/components/storefront/contact/contact-form'
import { WhatsAppIcon } from '@/components/ui/brand-icons'
import { Button } from '@/components/ui/button'
import { Container, SectionHeading } from '@/components/ui/primitives'
import { siteConfig, whatsappLink } from '@/lib/site-config'

export const metadata: Metadata = {
  title: 'Contact us',
  description:
    'Questions about an order, a size or a piece? Message Vennzya Fashion Hub on WhatsApp or send us a note — we reply within one working day.',
  alternates: { canonical: '/contact' },
}

export default function ContactPage() {
  return (
    <Container className="py-10 md:py-14">
      <SectionHeading
        as="h1"
        eyebrow="We’re here to help"
        title="Contact us"
        description="Whether it’s a sizing question, an order update or something that went wrong, a real person will read your message and reply."
      />

      <div className="grid gap-10 lg:grid-cols-[1fr_20rem] lg:gap-14">
        <ContactForm />

        <aside className="space-y-4">
          <div className="rounded-[var(--radius-card)] border border-border bg-card p-6">
            <h2 className="text-sm font-semibold">Fastest: WhatsApp</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              For anything urgent — a delivery question, a size you’re unsure about — WhatsApp is
              the quickest way to reach us.
            </p>
            <Button asChild variant="whatsapp" block className="mt-4">
              <a
                href={whatsappLink(`Hi ${siteConfig.shortName}! I have a question.`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon className="size-4" />
                Chat on WhatsApp
              </a>
            </Button>
          </div>

          <div className="space-y-4 rounded-[var(--radius-card)] border border-border bg-card p-6">
            <div className="flex gap-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-espresso-600" aria-hidden />
              <div>
                <h3 className="text-sm font-semibold">Email</h3>
                <a
                  href={`mailto:${siteConfig.email}`}
                  className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  {siteConfig.email}
                </a>
              </div>
            </div>

            <div className="flex gap-3">
              <Clock className="mt-0.5 size-4 shrink-0 text-espresso-600" aria-hidden />
              <div>
                <h3 className="text-sm font-semibold">Support hours</h3>
                <p className="text-sm text-muted-foreground">{siteConfig.supportHours}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-espresso-600" aria-hidden />
              <div>
                <h3 className="text-sm font-semibold">Where we ship</h3>
                <p className="text-sm text-muted-foreground">
                  Across India. Serviceability is confirmed by PIN code at checkout.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </Container>
  )
}
