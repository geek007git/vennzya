'use client'

import { ShieldCheck, ShieldOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/admin/content/confirm-dialog'
import { DataTable, StatusBadge, Td } from '@/components/admin/kit'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/primitives'
import { formatDate } from '@/lib/format'
import { PERMISSION_GROUPS, PERMISSIONS, type PermissionKey } from '@/modules/staff/permissions'
import { api } from '@/trpc/react'

export interface StaffRow {
  id: string
  name: string | null
  email: string | null
  role: 'OWNER' | 'STAFF' | 'CUSTOMER'
  banned: boolean
  createdAt: Date
  permissions: { permissionKey: string }[]
}

type StaffMember = StaffRow

export function StaffTable({ staff }: { staff: StaffMember[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<StaffMember | null>(null)
  const [draft, setDraft] = useState<PermissionKey[]>([])
  const [accessTarget, setAccessTarget] = useState<StaffMember | null>(null)

  const setPermissions = api.staff.setPermissions.useMutation()
  const setAccess = api.staff.setAccess.useMutation()

  function openPermissions(member: StaffMember) {
    setDraft(member.permissions.map((row) => row.permissionKey as PermissionKey))
    setEditing(member)
  }

  function toggle(key: PermissionKey) {
    setDraft((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    )
  }

  async function savePermissions() {
    if (!editing) return
    try {
      await setPermissions.mutateAsync({ userId: editing.id, permissions: draft })
      toast.success(`Permissions updated for ${editing.name ?? editing.email ?? 'this account'}`)
      setEditing(null)
      router.refresh()
    } catch (error) {
      // The router blocks editing yourself or the owner — say so rather than
      // hiding the control and leaving the reason a mystery.
      toast.error('Could not update permissions', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    }
  }

  async function confirmAccessChange() {
    if (!accessTarget) return
    const nextBanned = !accessTarget.banned

    try {
      await setAccess.mutateAsync({ userId: accessTarget.id, banned: nextBanned })
      toast.success(nextBanned ? 'Access revoked' : 'Access restored')
      setAccessTarget(null)
      router.refresh()
    } catch (error) {
      toast.error('Could not change access', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    }
  }

  return (
    <>
      <DataTable head={['Person', 'Role', 'Permissions', 'Access', 'Actions']}>
        {staff.map((member) => {
          const isOwner = member.role === 'OWNER'

          return (
            <tr key={member.id} className="hover:bg-espresso-50">
              <Td>
                <p className="font-medium">{member.name ?? 'Unnamed'}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{member.email}</p>
              </Td>
              <Td>
                <Badge variant={isOwner ? 'solid' : 'neutral'}>{isOwner ? 'Owner' : 'Staff'}</Badge>
              </Td>
              <Td className="max-w-sm">
                {isOwner ? (
                  <span className="text-xs text-muted-foreground">Everything</span>
                ) : member.permissions.length === 0 ? (
                  <span className="text-xs text-muted-foreground">None granted</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {member.permissions.map((row) => (
                      <Badge key={row.permissionKey} variant="outline">
                        {row.permissionKey}
                      </Badge>
                    ))}
                  </div>
                )}
              </Td>
              <Td>
                <StatusBadge
                  status={member.banned ? 'CANCELLED' : 'ACTIVE'}
                  label={member.banned ? 'Revoked' : 'Active'}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Since {formatDate(member.createdAt)}
                </p>
              </Td>
              <Td align="right">
                <div className="flex justify-end gap-1">
                  {!isOwner && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => openPermissions(member)}>
                        Permissions
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={
                          member.banned
                            ? `Restore access for ${member.email}`
                            : `Revoke access for ${member.email}`
                        }
                        onClick={() => setAccessTarget(member)}
                      >
                        {member.banned ? <ShieldCheck aria-hidden /> : <ShieldOff aria-hidden />}
                      </Button>
                    </>
                  )}
                </div>
              </Td>
            </tr>
          )
        })}
      </DataTable>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Permissions</DialogTitle>
            <DialogDescription>
              {editing?.name ?? editing?.email ?? 'This account'} can only reach the parts of the
              admin you tick here.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.label} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                {group.keys.map((key) => (
                  <label
                    key={key}
                    htmlFor={`staff-perm-${key}`}
                    className="flex cursor-pointer items-start gap-2.5 py-1"
                  >
                    <Checkbox
                      id={`staff-perm-${key}`}
                      checked={draft.includes(key)}
                      onCheckedChange={() => toggle(key)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="block text-sm">{PERMISSIONS[key]}</span>
                      <span className="block font-mono text-[11px] text-muted-foreground">
                        {key}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={savePermissions} loading={setPermissions.isPending}>
              Save permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={accessTarget !== null}
        onOpenChange={(open) => !open && setAccessTarget(null)}
        title={accessTarget?.banned ? 'Restore this account?' : 'Revoke this account?'}
        description={
          accessTarget?.banned
            ? `${accessTarget.email} will be able to sign in again with the permissions they had.`
            : `${accessTarget?.email ?? 'This person'} will be signed out everywhere immediately and won’t be able to sign in again until you restore them.`
        }
        confirmLabel={accessTarget?.banned ? 'Restore access' : 'Revoke access'}
        destructive={!accessTarget?.banned}
        onConfirm={confirmAccessChange}
      />
    </>
  )
}
