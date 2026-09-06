import { TRPCError } from '@trpc/server'
import type { Metadata } from 'next'
import { AdminCard, AdminPageHeader, DataTable, EmptyState, Td } from '@/components/admin/kit'
import { InviteForm } from '@/components/admin/staff/invite-form'
import { StaffTable } from '@/components/admin/staff/staff-table'
import { formatDateTime } from '@/lib/format'
import { trpc } from '@/trpc/server'

export const metadata: Metadata = {
  title: 'Staff',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

function PermissionDenied() {
  return (
    <AdminCard title="No access">
      <p className="text-sm text-muted-foreground">
        You don’t have permission to manage staff accounts. Only the owner, or someone granted the
        staff permission, can do this.
      </p>
    </AdminCard>
  )
}

async function loadStaff() {
  try {
    const [staff, auditLog] = await Promise.all([
      trpc.staff.list(),
      trpc.staff.auditLog({ limit: 30 }),
    ])
    return { staff, auditLog }
  } catch (error) {
    if (error instanceof TRPCError && error.code === 'FORBIDDEN') return null
    throw error
  }
}

export default async function AdminStaffPage() {
  const data = await loadStaff()

  if (!data) {
    return (
      <>
        <AdminPageHeader title="Staff" />
        <PermissionDenied />
      </>
    )
  }

  return (
    <>
      <AdminPageHeader
        title="Staff"
        description="Give each person their own account with only the access they need — never share the owner login."
      />

      <div className="space-y-8">
        <AdminCard title="Who has access">
          <StaffTable staff={data.staff} />
        </AdminCard>

        <AdminCard
          title="Invite someone"
          description="Creates an invite recorded against their email address."
        >
          <InviteForm />
        </AdminCard>

        <AdminCard
          title="Recent activity"
          description="Every change made in the admin, and who made it."
        >
          {data.auditLog.length === 0 ? (
            <EmptyState title="Nothing logged yet" />
          ) : (
            <DataTable head={['When', 'Who', 'Action', 'Affected']}>
              {data.auditLog.map((entry) => (
                <tr key={entry.id}>
                  <Td>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-xs">
                      {entry.user?.name ?? entry.user?.email ?? 'Removed account'}
                    </span>
                  </Td>
                  <Td>
                    <code className="rounded bg-espresso-100 px-1.5 py-0.5 text-xs">
                      {entry.action}
                    </code>
                  </Td>
                  <Td align="right">
                    <span className="text-xs text-muted-foreground">
                      {entry.entityType}
                      {entry.entityId ? ` · ${entry.entityId.slice(0, 8)}…` : ''}
                    </span>
                  </Td>
                </tr>
              ))}
            </DataTable>
          )}
        </AdminCard>
      </div>
    </>
  )
}
