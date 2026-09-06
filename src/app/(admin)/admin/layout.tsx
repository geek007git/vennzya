import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/admin/admin-shell'
import { auth } from '@/lib/auth'
import { PERMISSION_KEYS, type PermissionKey } from '@/modules/staff/permissions'
import { db } from '@/server/db'

// Admin data is per-user and never cacheable.
export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) redirect('/admin/login')

  const role = session.user.role
  if (role !== 'OWNER' && role !== 'STAFF') {
    // A signed-in shopper who wanders in gets sent home, not to a login loop.
    redirect('/')
  }

  if (session.user.banned) redirect('/admin/login')

  const permissions: PermissionKey[] =
    role === 'OWNER'
      ? PERMISSION_KEYS
      : (
          await db.staffPermission.findMany({
            where: { userId: session.user.id },
            select: { permissionKey: true },
          })
        ).map((row) => row.permissionKey as PermissionKey)

  return (
    <AdminShell
      user={{
        name: session.user.name ?? session.user.email ?? 'Staff',
        email: session.user.email ?? '',
        role,
      }}
      permissions={permissions}
    >
      {children}
    </AdminShell>
  )
}
