import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TestimonialView {
  id: string
  authorName: string
  location: string | null
  body: string
  rating: number | null
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden
          className={cn(
            'size-3.5',
            star <= rating ? 'fill-espresso-500 text-espresso-500' : 'text-espresso-300',
          )}
        />
      ))}
    </div>
  )
}

export function TestimonialList({
  testimonials,
  className,
}: {
  testimonials: TestimonialView[]
  className?: string
}) {
  if (testimonials.length === 0) return null

  return (
    <div className={cn('grid gap-4 md:grid-cols-3', className)}>
      {testimonials.map((testimonial) => (
        <figure
          key={testimonial.id}
          className="flex h-full flex-col gap-4 rounded-[var(--radius-card)] border border-border bg-card p-6"
        >
          {testimonial.rating && <Stars rating={testimonial.rating} />}
          <blockquote className="flex-1 text-sm leading-relaxed text-foreground">
            “{testimonial.body}”
          </blockquote>
          <figcaption className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{testimonial.authorName}</span>
            {testimonial.location && <span> · {testimonial.location}</span>}
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
