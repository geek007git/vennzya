import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ProductPurchase } from '@/components/storefront/product/product-purchase'
import { ProductGrid } from '@/components/storefront/product-card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Container, SectionHeading } from '@/components/ui/primitives'
import { siteConfig } from '@/lib/site-config'
import { trpc } from '@/trpc/server'

export const revalidate = 300

interface PageProps {
  params: Promise<{ productSlug: string }>
}

async function loadProduct(slug: string) {
  try {
    return await trpc.catalog.bySlug({ slug })
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { productSlug } = await params
  const product = await loadProduct(productSlug)

  if (!product) return { title: 'Product not found' }

  const title = product.seoTitle ?? product.name
  const description =
    product.seoDescription ?? product.shortDescription ?? product.description.slice(0, 180)

  return {
    title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: 'website',
      title,
      description,
      ...(product.images[0] ? { images: [{ url: product.images[0].url }] } : {}),
    },
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { productSlug } = await params
  const product = await loadProduct(productSlug)
  if (!product) notFound()

  const related = await trpc.catalog.related({
    productId: product.id,
    categoryIds: product.categories.map((category) => category.id),
  })

  const primaryCategory = product.categories[0]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription ?? product.description,
    image: product.images.map((image) => image.url),
    ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'INR',
      lowPrice: product.priceFrom,
      highPrice: product.priceTo ?? product.priceFrom,
      offerCount: product.variants.length,
      availability: product.isOutOfStock
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: siteConfig.name },
    },
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteConfig.url },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: `${siteConfig.url}/shop` },
      ...(primaryCategory
        ? [
            {
              '@type': 'ListItem',
              position: 3,
              name: primaryCategory.name,
              item: `${siteConfig.url}/shop/${primaryCategory.slug}`,
            },
          ]
        : []),
      {
        '@type': 'ListItem',
        position: primaryCategory ? 4 : 3,
        name: product.name,
        item: `${siteConfig.url}/products/${product.slug}`,
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is built server-side from our own data
        dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, breadcrumbLd]) }}
      />

      <Container className="py-8 md:py-12">
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <li>
              <Link href="/" className="hover:text-foreground">
                Home
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href="/shop" className="hover:text-foreground">
                Shop
              </Link>
            </li>
            {primaryCategory && (
              <>
                <li aria-hidden>/</li>
                <li>
                  <Link href={`/shop/${primaryCategory.slug}`} className="hover:text-foreground">
                    {primaryCategory.name}
                  </Link>
                </li>
              </>
            )}
            <li aria-hidden>/</li>
            <li className="text-foreground">{product.name}</li>
          </ol>
        </nav>

        <ProductPurchase product={product} />

        <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Details</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          </div>

          <Accordion type="single" collapsible className="lg:mt-9">
            {product.careInstructions && (
              <AccordionItem value="care">
                <AccordionTrigger>Care instructions</AccordionTrigger>
                <AccordionContent>{product.careInstructions}</AccordionContent>
              </AccordionItem>
            )}
            <AccordionItem value="shipping">
              <AccordionTrigger>Shipping & delivery</AccordionTrigger>
              <AccordionContent>
                <p>
                  Dispatched within 1–2 business days. Delivery typically takes 3–7 business days
                  depending on your pin code. Free shipping on orders above ₹
                  {siteConfig.freeShippingThreshold}.
                </p>
                <Link href="/policies/shipping" className="mt-2 inline-block underline underline-offset-4">
                  Read the full shipping policy
                </Link>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="returns">
              <AccordionTrigger>Returns & refunds</AccordionTrigger>
              <AccordionContent>
                <p>
                  Eligible items can be returned within {siteConfig.returnWindowDays} days of
                  delivery, unworn and with tags intact. Refunds are issued to the original payment
                  method once the return is received.
                </p>
                <Link href="/policies/returns" className="mt-2 inline-block underline underline-offset-4">
                  Read the full returns policy
                </Link>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {related.length > 0 && (
          <section className="mt-20">
            <SectionHeading eyebrow="You might also like" title="Pairs well with" />
            <ProductGrid products={related} priorityCount={0} />
          </section>
        )}
      </Container>
    </>
  )
}
