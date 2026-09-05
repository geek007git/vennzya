import { ArrowRight, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { CategoryGrid } from '@/components/storefront/home/category-grid'
import { Hero } from '@/components/storefront/home/hero'
import { TestimonialList } from '@/components/storefront/home/testimonial-list'
import { TrustStrip } from '@/components/storefront/home/trust-strip'
import { ProductGrid } from '@/components/storefront/product-card'
import { Button } from '@/components/ui/button'
import { Container, SectionHeading } from '@/components/ui/primitives'
import { siteConfig, whatsappLink } from '@/lib/site-config'
import { buildCategoryTree } from '@/modules/catalog/categories'
import { trpc } from '@/trpc/server'

// Content is owner-editable, so the page is rebuilt on a schedule rather than
// per request; admin saves also purge it via /api/revalidate.
export const revalidate = 300

export default async function HomePage() {
  const [heroBanners, categories, featured, newArrivals, testimonials] = await Promise.all([
    trpc.content.banners({ placement: 'HOMEPAGE_HERO' }),
    trpc.catalog.categories(),
    trpc.catalog.featured({ limit: 8 }),
    trpc.catalog.list({ sort: 'newest', limit: 4, inStockOnly: true, featuredOnly: false }),
    trpc.content.testimonials({ featuredOnly: true, limit: 3 }),
  ])

  const hero = heroBanners[0]

  const topCategories = buildCategoryTree(categories)

  return (
    <>
      <Hero
        title={hero?.title}
        subtitle={hero?.subtitle}
        imageUrl={hero?.imageUrl}
        ctaLabel={hero?.ctaLabel}
        ctaHref={hero?.linkUrl}
      />

      <section className="section-y">
        <Container>
          <SectionHeading
            eyebrow="Browse"
            title="Shop by category"
            description="Three edits, each chosen with the same eye for detail."
          />
          <CategoryGrid categories={topCategories} />
        </Container>
      </section>

      {featured.length > 0 && (
        <section className="section-y bg-cream-50">
          <Container>
            <SectionHeading
              eyebrow="Handpicked"
              title="Featured pieces"
              description="The ones our customers keep coming back for."
              action={
                <Button asChild variant="outline">
                  <Link href="/shop">
                    View all
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              }
            />
            <ProductGrid products={featured} />
          </Container>
        </section>
      )}

      {newArrivals.items.length > 0 && (
        <section className="section-y">
          <Container>
            <SectionHeading
              eyebrow="Just in"
              title="New arrivals"
              description="Fresh additions to the collection, restocked every week."
              action={
                <Button asChild variant="ghost">
                  <Link href="/shop?sort=newest">
                    See what’s new
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              }
            />
            <ProductGrid products={newArrivals.items} priorityCount={0} />
          </Container>
        </section>
      )}

      <section className="section-y bg-cream-50">
        <Container>
          <SectionHeading
            eyebrow="Why Vennzya"
            title="Shopping you can trust"
            align="center"
          />
          <TrustStrip />
        </Container>
      </section>

      {testimonials.length > 0 && (
        <section className="section-y">
          <Container>
            <SectionHeading
              eyebrow="In their words"
              title="Loved by our customers"
              align="center"
              description="Real reviews from shoppers across India."
            />
            <TestimonialList testimonials={testimonials} />
            <div className="mt-8 text-center">
              <Button asChild variant="ghost">
                <Link href="/testimonials">Read all reviews</Link>
              </Button>
            </div>
          </Container>
        </section>
      )}

      <section className="pb-16 md:pb-24">
        <Container>
          <div className="flex flex-col items-center gap-5 rounded-[var(--radius-card)] bg-espresso-900 px-6 py-12 text-center text-cream-100 md:px-12">
            <MessageCircle className="size-8 text-cream-200/80" aria-hidden />
            <h2 className="max-w-lg text-2xl font-semibold text-cream-50 md:text-3xl">
              Not sure about a size or a stone? Just ask.
            </h2>
            <p className="max-w-md text-sm text-cream-100/75">
              Message us on WhatsApp and a real person will help you choose — {siteConfig.supportHours}.
            </p>
            <Button asChild variant="whatsapp" size="lg">
              <a
                href={whatsappLink('Hi! I would like some help choosing a piece.')}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle aria-hidden />
                Chat on WhatsApp
              </a>
            </Button>
          </div>
        </Container>
      </section>
    </>
  )
}
