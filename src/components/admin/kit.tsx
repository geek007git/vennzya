import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'

/**
 * Shared furniture for the admin screens, so every list and form page looks
 * and behaves the same without each one reinventing a table.
 */

export function AdminPageHeader({
  title,
  description,
  backHref,
  action,
}: {
  title: string
  description?: string
  backHref?: { href: string; label: string }
  action?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
      <div className="space-y-1">
        {backHref && (
          <Link
            href={backHref.href}
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            ← {backHref.label}
          </Link>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  )
}

export function AdminCard({
  title,
  description,
  action,
  className,
  children,
}: {
  title?: string
  description?: string
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn('rounded-[var(--radius-card)] border border-border bg-card', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-border px-6 py-16 text-center">
      <h2 className="text-base font-semibold">{title}</h2>
      {description && (
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  )
}

/**
 * Tables scroll horizontally rather than squashing on a phone — the owner
 * checks orders from a handset more often than from a desk.
 */
export function DataTable({
  head,
  children,
  className,
}: {
  head: React.ReactNode[]
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'overflow-x-auto rounded-[var(--radius-card)] border border-border bg-card',
        className,
      )}
    >
      <table className="w-full min-w-[42rem] text-sm">
        <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            {head.map((cell, index) => (
              <th
                // biome-ignore lint/suspicious/noArrayIndexKey: static column definitions
                key={index}
                className={cn('px-4 py-3 font-medium', index === head.length - 1 && 'text-right')}
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  )
}

export function Td({
  children,
  align,
  className,
}: {
  children: React.ReactNode
  align?: 'right'
  className?: string
}) {
  return (
    <td className={cn('px-4 py-3 align-middle', align === 'right' && 'text-right', className)}>
      {children}
    </td>
  )
}

const ORDER_STATUS_TONE: Record<string, 'neutral' | 'success' | 'sale' | 'outline'> = {
  CREATED: 'outline',
  CONFIRMED: 'neutral',
  PROCESSING: 'neutral',
  COMPLETED: 'success',
  CANCELLED: 'sale',
  REFUNDED: 'sale',
  PENDING: 'outline',
  PAID: 'success',
  FAILED: 'sale',
  COD_PENDING: 'neutral',
  COD_COLLECTED: 'success',
  PARTIALLY_REFUNDED: 'sale',
  NOT_SHIPPED: 'outline',
  PACKED: 'neutral',
  SHIPPED: 'neutral',
  OUT_FOR_DELIVERY: 'neutral',
  DELIVERED: 'success',
  RETURN_INITIATED: 'sale',
  RETURNED: 'sale',
  DRAFT: 'outline',
  ACTIVE: 'success',
  ARCHIVED: 'neutral',
  NEW: 'sale',
  IN_PROGRESS: 'neutral',
  RESOLVED: 'success',
  SPAM: 'outline',
}

/** Turns an enum value into something a human reads. */
export function humanizeStatus(status: string): string {
  const words = status.toLowerCase().replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <Badge variant={ORDER_STATUS_TONE[status] ?? 'neutral'}>
      {label ?? humanizeStatus(status)}
    </Badge>
  )
}

export function CursorPager({
  hasMore,
  nextHref,
  prevHref,
}: {
  hasMore: boolean
  nextHref?: string
  prevHref?: string
}) {
  if (!hasMore && !prevHref) return null

  return (
    <div className="mt-4 flex items-center justify-end gap-2">
      {prevHref && (
        <Button asChild variant="outline" size="sm">
          <Link href={prevHref}>Previous</Link>
        </Button>
      )}
      {hasMore && nextHref && (
        <Button asChild variant="outline" size="sm">
          <Link href={nextHref}>Next</Link>
        </Button>
      )}
    </div>
  )
}
