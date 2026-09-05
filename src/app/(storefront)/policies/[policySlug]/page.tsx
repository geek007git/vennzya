import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Container, SectionHeading } from '@/components/ui/primitives'
import { formatDate } from '@/lib/format'
import { siteConfig } from '@/lib/site-config'
import { trpc } from '@/trpc/server'

export const revalidate = 3600

/** The owner edits these in the admin; the route stays the same. */
const POLICY_KEYS = ['privacy', 'terms', 'shipping', 'returns'] as const
type PolicyKey = (typeof POLICY_KEYS)[number]

const FALLBACK_DESCRIPTION: Record<PolicyKey, string> = {
  privacy: `How ${siteConfig.name} collects, uses and protects your personal information.`,
  terms: `The terms that apply when you shop with ${siteConfig.name}.`,
  shipping: `Delivery timelines, charges and coverage for orders from ${siteConfig.name}.`,
  returns: `How to return an item and how refunds are processed at ${siteConfig.name}.`,
}

function isPolicyKey(value: string): value is PolicyKey {
  return (POLICY_KEYS as readonly string[]).includes(value)
}

interface PageProps {
  params: Promise<{ policySlug: string }>
}

export function generateStaticParams() {
  return POLICY_KEYS.map((policySlug) => ({ policySlug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { policySlug } = await params
  if (!isPolicyKey(policySlug)) return { title: 'Page not found' }

  const page = await trpc.content.page({ pageKey: policySlug })
  if (!page) return { title: 'Page not found' }

  return {
    title: page.seoTitle ?? page.title,
    description: page.seoDescription ?? FALLBACK_DESCRIPTION[policySlug],
    alternates: { canonical: `/policies/${policySlug}` },
  }
}

export default async function PolicyPage({ params }: PageProps) {
  const { policySlug } = await params
  if (!isPolicyKey(policySlug)) notFound()

  const page = await trpc.content.page({ pageKey: policySlug })
  if (!page) notFound()

  return (
    <Container className="py-10 md:py-14">
      <div className="mx-auto max-w-3xl">
        <SectionHeading as="h1" eyebrow="Policies" title={page.title} />

        <p className="-mt-4 mb-8 text-xs text-muted-foreground md:-mt-8">
          Last updated {formatDate(page.updatedAt)}
        </p>

        <div
          className={[
            'text-sm leading-relaxed text-muted-foreground',
            '[&>*+*]:mt-4',
            '[&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground',
            '[&_h3]:mt-8 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground',
            '[&_strong]:font-semibold [&_strong]:text-foreground',
            '[&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5',
            '[&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5',
            '[&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4',
            '[&_blockquote]:border-l-2 [&_blockquote]:border-espresso-300 [&_blockquote]:bg-espresso-50 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:rounded-r-md',
            '[&_table]:w-full [&_table]:border-collapse [&_table]:text-left',
            '[&_th]:border-b [&_th]:border-border [&_th]:py-2 [&_th]:pr-4 [&_th]:font-semibold [&_th]:text-foreground',
            '[&_td]:border-b [&_td]:border-border [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top',
            '[&_hr]:my-8 [&_hr]:border-border',
            '[&_code]:rounded [&_code]:bg-espresso-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs',
          ].join(' ')}
        >
          <Markdown remarkPlugins={[remarkGfm]}>{page.bodyMarkdown}</Markdown>
        </div>

        <div className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
          Something unclear here?{' '}
          <Link href="/contact" className="text-foreground underline underline-offset-4">
            Get in touch
          </Link>{' '}
          and we’ll explain it properly.
        </div>
      </div>
    </Container>
  )
}
