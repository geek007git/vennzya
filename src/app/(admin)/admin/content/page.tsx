import { TRPCError } from '@trpc/server'
import type { Metadata } from 'next'
import { BannersSection } from '@/components/admin/content/banners-section'
import { CollectionsSection } from '@/components/admin/content/collections-section'
import { FaqSection } from '@/components/admin/content/faq-section'
import {
  type PolicyPage,
  PolicyPagesSection,
} from '@/components/admin/content/policy-pages-section'
import { TestimonialsSection } from '@/components/admin/content/testimonials-section'
import { AdminCard, AdminPageHeader } from '@/components/admin/kit'
import { trpc } from '@/trpc/server'

export const metadata: Metadata = {
  title: 'Content',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

const SECTIONS = [
  { id: 'banners', label: 'Banners' },
  { id: 'collections', label: 'Collections' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'faq', label: 'FAQ' },
  { id: 'policies', label: 'Policy pages' },
]

function PermissionDenied() {
  return (
    <AdminCard title="No access">
      <p className="text-sm text-muted-foreground">
        You don’t have permission to manage website content. Ask the owner to grant you the content
        permission.
      </p>
    </AdminCard>
  )
}

async function loadContent() {
  try {
    const [banners, collections, testimonials, faq, pageStubs] = await Promise.all([
      trpc.contentAdmin.banners(),
      trpc.contentAdmin.collections(),
      trpc.contentAdmin.testimonials(),
      trpc.contentAdmin.faq(),
      trpc.contentAdmin.pages(),
    ])

    // `pages` omits the SEO fields, and saving without them would blank them,
    // so pull the full row per page before handing it to the editor.
    const pages: PolicyPage[] = await Promise.all(
      pageStubs.map(async (stub) => {
        const full = await trpc.content.page({ pageKey: stub.pageKey })
        return {
          pageKey: stub.pageKey,
          title: stub.title,
          bodyMarkdown: stub.bodyMarkdown,
          seoTitle: full?.seoTitle ?? null,
          seoDescription: full?.seoDescription ?? null,
          updatedAt: stub.updatedAt,
        }
      }),
    )

    return { banners, collections, testimonials, faq, pages }
  } catch (error) {
    if (error instanceof TRPCError && error.code === 'FORBIDDEN') return null
    throw error
  }
}

export default async function AdminContentPage() {
  const content = await loadContent()

  if (!content) {
    return (
      <>
        <AdminPageHeader title="Content" />
        <PermissionDenied />
      </>
    )
  }

  return (
    <>
      <AdminPageHeader
        title="Content"
        description="Everything customers read on the storefront — banners, collections, reviews, FAQ and your policies."
      />

      <nav aria-label="Content sections" className="mb-8 flex flex-wrap gap-2">
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm transition-colors hover:border-espresso-400 hover:bg-espresso-50"
          >
            {section.label}
          </a>
        ))}
      </nav>

      <div className="space-y-8">
        <AdminCard
          title="Banners"
          description="Promotional strips on the homepage and the announcement bar."
          className="scroll-mt-8"
        >
          <div id="banners" className="scroll-mt-24" />
          <BannersSection banners={content.banners} />
        </AdminCard>

        <AdminCard
          title="Collections"
          description="Curated groups of products, separate from the category tree."
        >
          <div id="collections" className="scroll-mt-24" />
          <CollectionsSection collections={content.collections} />
        </AdminCard>

        <AdminCard
          title="Customer reviews"
          description="Shown on the homepage and the reviews page once approved."
        >
          <div id="reviews" className="scroll-mt-24" />
          <TestimonialsSection testimonials={content.testimonials} />
        </AdminCard>

        <AdminCard title="FAQ" description="The questions customers ask before they buy.">
          <div id="faq" className="scroll-mt-24" />
          <FaqSection items={content.faq} />
        </AdminCard>

        <AdminCard
          title="Policy pages"
          description="Privacy, terms, shipping and returns — written in markdown."
        >
          <div id="policies" className="scroll-mt-24" />
          <PolicyPagesSection pages={content.pages} />
        </AdminCard>
      </div>
    </>
  )
}
