import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide',
  {
    variants: {
      variant: {
        neutral: 'bg-espresso-100 text-espresso-800',
        solid: 'bg-espresso-800 text-cream-50',
        outline: 'border border-espresso-300 text-espresso-700',
        sale: 'bg-destructive text-destructive-foreground',
        success: 'bg-[color:var(--success)]/12 text-[color:var(--success)]',
        muted: 'bg-espresso-950/70 text-cream-50 backdrop-blur-sm',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-espresso-100', className)} {...props} />
}

export function Separator({
  className,
  orientation = 'horizontal',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { orientation?: 'horizontal' | 'vertical' }) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        'bg-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  )
}

/** Page gutter + max width. Every page section sits inside one of these. */
export function Container({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('container-page', className)} {...props} />
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  as: As = 'h2',
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  align?: 'left' | 'center'
  as?: 'h1' | 'h2'
  action?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-3 md:mb-12',
        align === 'center' && 'items-center text-center',
        action && 'md:flex-row md:items-end md:justify-between',
      )}
    >
      <div className={cn('space-y-2', align === 'center' && 'max-w-2xl')}>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <As
          className={cn(
            'font-semibold text-foreground',
            As === 'h1' ? 'text-3xl md:text-5xl' : 'text-2xl md:text-4xl',
          )}
        >
          {title}
        </As>
        {description && (
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}
