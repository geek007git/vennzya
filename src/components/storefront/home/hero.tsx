import { ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface HeroProps {
  title?: string | null
  subtitle?: string | null
  imageUrl?: string | null
  ctaLabel?: string | null
  ctaHref?: string | null
}

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1400&q=80&auto=format&fit=crop'

export function Hero({ title, subtitle, imageUrl, ctaLabel, ctaHref }: HeroProps) {
  return (
    <section className="container-page pt-6 md:pt-10">
      <div className="overflow-hidden rounded-[var(--radius-card)] bg-card shadow-card">
        <div className="grid items-stretch lg:grid-cols-[1fr_1.1fr]">
          <div className="flex flex-col justify-center gap-6 px-6 py-12 sm:px-10 md:py-16 lg:px-14">
            <p className="eyebrow">New season · Made to last</p>

            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-espresso-950 sm:text-5xl lg:text-6xl">
              {title ?? (
                <>
                  Style Redefined,
                  <span className="block text-espresso-600">Just for You</span>
                </>
              )}
            </h1>

            <p className="max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
              {subtitle ??
                'A considered edit of women’s clothing, jewellery and accessories — chosen for quality you can feel, and delivered across India.'}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href={ctaHref ?? '/shop'}>
                  {ctaLabel ?? 'Shop now'}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/shop/jewellery">Explore jewellery</Link>
              </Button>
            </div>

            <dl className="mt-2 flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-6 text-xs text-muted-foreground">
              <div>
                <dt className="font-semibold text-foreground">Free shipping</dt>
                <dd>On orders over ₹1,499</dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">Easy returns</dt>
                <dd>7-day return window</dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">Secure payments</dt>
                <dd>UPI, cards & COD</dd>
              </div>
            </dl>
          </div>

          <div className="relative min-h-[22rem] lg:min-h-[34rem]">
            <Image
              src={imageUrl ?? FALLBACK_IMAGE}
              alt="Vennzya new season collection"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover"
            />
            <div className="absolute inset-x-4 bottom-4 flex flex-wrap gap-2">
              {['Considered design', 'Honest quality', 'Delivered across India'].map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-espresso-950/75 px-3 py-1.5 text-[11px] font-medium text-cream-50 backdrop-blur-sm"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
