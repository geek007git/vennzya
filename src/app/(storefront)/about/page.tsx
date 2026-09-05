import { Play, Ruler, Scissors, Sparkles } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { WhatsAppIcon } from '@/components/ui/brand-icons'
import { Button } from '@/components/ui/button'
import { Container, SectionHeading } from '@/components/ui/primitives'
import { siteConfig, whatsappLink } from '@/lib/site-config'

export const metadata: Metadata = {
  title: 'About us',
  description:
    'Why Vennzya Fashion Hub exists, how each piece is chosen, and how we think about quality, fit and honest pricing for the modern Indian wardrobe.',
  alternates: { canonical: '/about' },
}

const PRINCIPLES = [
  {
    icon: Sparkles,
    title: 'Chosen, not stocked',
    body: 'We buy in small runs and only take on a piece if someone here would genuinely wear it. A smaller collection is easier to trust than an endless one.',
  },
  {
    icon: Scissors,
    title: 'Fabric first',
    body: 'Cotton that breathes through an Indian summer, linen that softens rather than sags, plating that survives daily wear. We check the material before the look.',
  },
  {
    icon: Ruler,
    title: 'Fit you can plan for',
    body: 'Measurements are listed honestly, and if you’re between sizes we would rather tell you than sell you the wrong one. Ask us before you order.',
  },
]

const STORY_IMAGE =
  'https://images.unsplash.com/photo-1479064555552-3ef4979f8908?w=1200&q=80&auto=format&fit=crop'
const CRAFT_IMAGE =
  'https://images.unsplash.com/photo-1606522754091-a3bbf9ad4cb3?w=1200&q=80&auto=format&fit=crop'

export default function AboutPage() {
  return (
    <>
      <Container className="py-10 md:py-14">
        <SectionHeading
          as="h1"
          eyebrow="Our story"
          title="Built around pieces worth keeping"
          description="Vennzya Fashion Hub began with a simple frustration: plenty of places to buy clothes online, far fewer where you could trust what turned up."
        />

        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground md:text-base">
            <p>
              We started Vennzya because shopping online too often meant guessing — guessing at the
              fabric, the finish, whether the colour on screen was the colour in the parcel. The
              answer, we thought, wasn’t a bigger catalogue. It was a smaller, better-chosen one.
            </p>
            <p>
              So we keep the collection deliberately tight. Women’s clothing, jewellery and
              accessories, each piece picked for how it actually wears — how the seam sits after a
              wash, whether the plating lasts past a season, how a scarf drapes when you’re in a
              hurry.
            </p>
            <p>
              We would rather carry twelve pieces we can vouch for than a hundred we can’t. That
              also means we can tell you honestly when something isn’t right for you.
            </p>
          </div>

          <div className="relative aspect-4/5 overflow-hidden rounded-[var(--radius-card)] bg-espresso-100 lg:aspect-square">
            <Image
              src={STORY_IMAGE}
              alt="A neutral-toned edit from the Vennzya collection"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover"
            />
          </div>
        </div>
      </Container>

      <section className="section-y bg-cream-50">
        <Container>
          <SectionHeading
            eyebrow="How we choose"
            title="What earns a place in the collection"
            align="center"
          />

          <div className="grid gap-4 md:grid-cols-3">
            {PRINCIPLES.map((principle) => (
              <div
                key={principle.title}
                className="rounded-[var(--radius-card)] border border-border bg-card p-6"
              >
                <principle.icon className="size-5 text-espresso-600" aria-hidden />
                <h3 className="mt-3 text-base font-semibold text-foreground">{principle.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {principle.body}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="section-y">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            {/*
              Links out to the channel rather than embedding: a channel URL is
              not embeddable, and this ships no third-party iframe or script.
            */}
            <a
              href={siteConfig.social.youtube}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Watch Vennzya on YouTube"
              className="group relative block aspect-video overflow-hidden rounded-[var(--radius-card)] bg-espresso-100"
            >
              <Image
                src={CRAFT_IMAGE}
                alt=""
                aria-hidden
                fill
                loading="lazy"
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-espresso-950/25 transition-colors group-hover:bg-espresso-950/35" />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="inline-flex size-16 items-center justify-center rounded-full bg-cream-50/95 text-espresso-900 shadow-card transition-transform duration-200 ease-[var(--ease-out-soft)] group-hover:scale-105">
                  <Play className="ml-0.5 size-6 fill-current" aria-hidden />
                </span>
              </span>
            </a>

            <div className="space-y-4">
              <p className="eyebrow">Behind the pieces</p>
              <h2 className="text-2xl font-semibold md:text-3xl">See it before you buy it</h2>
              <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                Photographs only tell you so much. On our YouTube channel we film pieces as they
                move — how a kurta falls, how a stone catches light — so you know what you’re
                getting before it arrives.
              </p>
              <Button asChild variant="outline">
                <a href={siteConfig.social.youtube} target="_blank" rel="noopener noreferrer">
                  Watch on YouTube
                </a>
              </Button>
            </div>
          </div>
        </Container>
      </section>

      <section className="pb-16 md:pb-24">
        <Container>
          <div className="flex flex-col items-center gap-5 rounded-[var(--radius-card)] bg-espresso-900 px-6 py-12 text-center text-cream-100 md:px-12">
            <h2 className="max-w-lg text-2xl font-semibold text-cream-50 md:text-3xl">
              Talk to us before you order
            </h2>
            <p className="max-w-md text-sm text-cream-100/75">
              Unsure about a size, a fabric or a stone? Message us — {siteConfig.supportHours}. We’d
              rather help you choose than process a return.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="whatsapp" size="lg">
                <a
                  href={whatsappLink(`Hi ${siteConfig.shortName}! I’d like some help choosing.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <WhatsAppIcon className="size-4" />
                  Chat on WhatsApp
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-cream-100/30 text-cream-50 hover:bg-cream-100/10"
              >
                <Link href="/shop">Browse the collection</Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}
