import { TRPCError } from '@trpc/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { AdminCard, AdminPageHeader, CursorPager } from '@/components/admin/kit'
import { MessageList } from '@/components/admin/messages/message-list'
import { cn } from '@/lib/utils'
import { CONTACT_STATUSES } from '@/modules/support/schema'
import { trpc } from '@/trpc/server'

export const metadata: Metadata = {
  title: 'Messages',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type ContactStatus = (typeof CONTACT_STATUSES)[number]

const FILTERS: { label: string; value: ContactStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'New', value: 'NEW' },
  { label: 'In progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Spam', value: 'SPAM' },
]

function isContactStatus(value: string): value is ContactStatus {
  return (CONTACT_STATUSES as readonly string[]).includes(value)
}

function PermissionDenied() {
  return (
    <AdminCard title="No access">
      <p className="text-sm text-muted-foreground">
        You don’t have permission to read customer messages. Ask the owner to grant you the support
        permission.
      </p>
    </AdminCard>
  )
}

interface PageProps {
  searchParams: Promise<{ status?: string; cursor?: string }>
}

export default async function AdminMessagesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const status = params.status && isContactStatus(params.status) ? params.status : undefined
  const cursor = params.cursor

  const data = await trpc.support
    .list({
      ...(status ? { status } : {}),
      ...(cursor ? { cursor } : {}),
      limit: 25,
    })
    .catch((error: unknown) => {
      if (error instanceof TRPCError && error.code === 'FORBIDDEN') return null
      throw error
    })

  if (!data) {
    return (
      <>
        <AdminPageHeader title="Messages" />
        <PermissionDenied />
      </>
    )
  }

  function filterHref(value: ContactStatus | 'ALL'): string {
    return value === 'ALL' ? '/admin/messages' : `/admin/messages?status=${value}`
  }

  const nextHref = data.nextCursor
    ? `/admin/messages?${new URLSearchParams({
        ...(status ? { status } : {}),
        cursor: data.nextCursor,
      }).toString()}`
    : undefined

  return (
    <>
      <AdminPageHeader
        title="Messages"
        description="Enquiries from the contact form. Moving one out of “New” clears it from the dashboard."
      />

      <nav aria-label="Filter by status" className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const isCurrent = filter.value === 'ALL' ? status === undefined : status === filter.value

          return (
            <Link
              key={filter.value}
              href={filterHref(filter.value)}
              aria-current={isCurrent ? 'page' : undefined}
              className={cn(
                'inline-flex h-11 items-center rounded-md border px-4 text-sm transition-colors',
                isCurrent
                  ? 'border-espresso-800 bg-espresso-800 text-cream-50'
                  : 'border-border hover:border-espresso-400 hover:bg-espresso-50',
              )}
            >
              {filter.label}
            </Link>
          )
        })}
      </nav>

      <MessageList submissions={data.items} />

      <CursorPager
        hasMore={data.nextCursor !== null}
        {...(nextHref ? { nextHref } : {})}
        {...(cursor ? { prevHref: filterHref(status ?? 'ALL') } : {})}
      />
    </>
  )
}
