import type { Metadata } from 'next'
import Link from 'next/link'
import { WhatsAppIcon } from '@/components/ui/brand-icons'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Container, SectionHeading } from '@/components/ui/primitives'
import { siteConfig, whatsappLink } from '@/lib/site-config'
import { trpc } from '@/trpc/server'

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Answers to common questions about shipping, returns, Cash on Delivery, sizing, jewellery care and order tracking at Vennzya Fashion Hub.',
  alternates: { canonical: '/faq' },
}

export const revalidate = 3600

export default async function FaqPage() {
  const faqs = await trpc.content.faq()

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }

  return (
    <>
      {faqs.length > 0 && (
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is built server-side from our own data
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

      <Container className="py-10 md:py-14">
        <div className="mx-auto max-w-3xl">
          <SectionHeading
            as="h1"
            eyebrow="Good to know"
            title="Frequently asked questions"
            description="Everything shoppers usually ask us. If your question isn’t here, message us — we’re happy to help."
          />

          {faqs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              We’re putting these together. In the meantime, message us on WhatsApp and we’ll answer
              directly.
            </p>
          ) : (
            <Accordion type="single" collapsible>
              {faqs.map((faq) => (
                <AccordionItem key={faq.id} value={faq.id}>
                  <AccordionTrigger>{faq.question}</AccordionTrigger>
                  <AccordionContent>{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}

          <div className="mt-12 rounded-[var(--radius-card)] bg-espresso-900 px-6 py-10 text-center text-cream-100">
            <h2 className="text-xl font-semibold text-cream-50 md:text-2xl">
              Still have a question?
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-cream-100/75">
              Message us on WhatsApp and a real person will get back to you — {siteConfig.supportHours}.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild variant="whatsapp">
                <a
                  href={whatsappLink(`Hi ${siteConfig.shortName}! I have a question.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <WhatsAppIcon className="size-4" />
                  Chat on WhatsApp
                </a>
              </Button>
              <Button asChild variant="outline" className="border-cream-100/30 text-cream-50 hover:bg-cream-100/10">
                <Link href="/contact">Send a message</Link>
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </>
  )
}
