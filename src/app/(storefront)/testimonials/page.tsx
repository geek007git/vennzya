import type { Metadata } from 'next'
import Link from 'next/link'
import { TestimonialList } from '@/components/storefront/home/testimonial-list'
import { Button } from '@/components/ui/button'
import { Container, SectionHeading } from '@/components/ui/primitives'
import { trpc } from '@/trpc/server'

export const metadata: Metadata = {
  title: 'Customer reviews',
  description:
    'What customers across India say about shopping with Vennzya Fashion Hub — fabric, fit, finish and delivery, in their own words.',
  alternates: { canonical: '/testimonials' },
}

export const revalidate = 3600

export default async function TestimonialsPage() {
  const testimonials = await trpc.content.testimonials({ featuredOnly: false, limit: 24 })

  return (
    <Container className="py-10 md:py-14">
      <SectionHeading
        as="h1"
        align="center"
        eyebrow="In their words"
        title="What our customers say"
        description="Every review here comes from someone who bought and wore the piece. We publish them as they are."
      />

      {testimonials.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          We’re collecting reviews from our first customers — check back soon.
        </p>
      ) : (
        <TestimonialList testimonials={testimonials} />
      )}

      <div className="mt-12 text-center">
        <p className="text-sm text-muted-foreground">
          Found something you like the sound of?
        </p>
        <Button asChild size="lg" className="mt-4">
          <Link href="/shop">Shop the collection</Link>
        </Button>
      </div>
    </Container>
  )
}
