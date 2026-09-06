import { TRPCError } from '@trpc/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { CustomerSearch } from '@/components/admin/customers/customer-search'
import { AdminPageHeader, CursorPager, DataTable, EmptyState, Td } from '@/components/admin/kit'
import { formatDate, formatInrCompact } from '@/lib/format'
import { formatPhone } from '@/lib/india'
import { trpc } from '@/trpc/server'

export const metadata: Metadata = {
  title: 'Customers',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ q?: string; cursor?: string }>
}

export default async function AdminCustomersPage({ searchParams }: PageProps) {
  const { q, cursor } = await searchParams

  let result: Awaited<ReturnType<typeof trpc.customers.list>>

  try {
    result = await trpc.customers.list({
      ...(q ? { q } : {}),
      ...(cursor ? { cursor } : {}),
      limit: 25,
    })
  } catch (error) {
    if (error instanceof TRPCError && error.code === 'FORBIDDEN') {
      return (
        <EmptyState
          title="You don’t have permission to view customers"
          description="Ask the owner to grant you the customers permission if you need access."
        />
      )
    }
    throw error
  }

  const nextQuery = new URLSearchParams()
  if (q) nextQuery.set('q', q)
  if (result.nextCursor) nextQuery.set('cursor', result.nextCursor)

  const firstPageHref = q ? `/admin/customers?q=${encodeURIComponent(q)}` : '/admin/customers'

  return (
    <div>
      <AdminPageHeader
        title="Customers"
        description="Everyone who has shopped with you, including guests."
        action={<CustomerSearch />}
      />

      {result.items.length === 0 ? (
        <EmptyState
          title={q ? `No customers match “${q}”` : 'No customers yet'}
          description={
            q
              ? 'Try a different name, phone number or email.'
              : 'Customer records appear here as soon as the first order is placed.'
          }
        />
      ) : (
        <>
          <DataTable
            head={['Customer', 'Contact', 'Orders', 'Lifetime value', 'Last order', 'Joined']}
          >
            {result.items.map((customer) => (
              <tr key={customer.id} className="hover:bg-espresso-50">
                <Td className="min-w-44">
                  <Link
                    href={`/admin/customers/${customer.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {customer.name ?? 'Guest customer'}
                  </Link>
                </Td>
                <Td className="whitespace-nowrap text-muted-foreground">
                  <span className="block">
                    {customer.phoneNumber ? formatPhone(customer.phoneNumber) : '—'}
                  </span>
                  <span className="block text-xs">{customer.email ?? '—'}</span>
                </Td>
                <Td className="whitespace-nowrap text-muted-foreground">{customer.orderCount}</Td>
                <Td className="whitespace-nowrap">{formatInrCompact(customer.lifetimeValue)}</Td>
                <Td className="whitespace-nowrap text-muted-foreground">
                  {customer.lastOrderAt ? formatDate(customer.lastOrderAt) : '—'}
                </Td>
                <Td align="right" className="whitespace-nowrap text-muted-foreground">
                  {formatDate(customer.createdAt)}
                </Td>
              </tr>
            ))}
          </DataTable>

          <CursorPager
            hasMore={result.nextCursor !== null}
            nextHref={`/admin/customers?${nextQuery}`}
          />

          {cursor && (
            <div className="mt-2 text-right">
              <Link
                href={firstPageHref}
                className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Back to first page
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}
