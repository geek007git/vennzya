'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Copy, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { formatDate } from '@/lib/format'
import { PERMISSION_GROUPS, PERMISSIONS, type PermissionKey } from '@/modules/staff/permissions'
import { api } from '@/trpc/react'

const formSchema = z.object({
  email: z.string().trim().email('Enter their work email'),
})

type FormValues = z.infer<typeof formSchema>

interface IssuedInvite {
  email: string
  token: string
  expiresAt: Date
}

export function InviteForm() {
  const router = useRouter()
  const [permissions, setPermissions] = useState<PermissionKey[]>([])
  const [issued, setIssued] = useState<IssuedInvite | null>(null)
  const [copied, setCopied] = useState(false)

  const invite = api.staff.invite.useMutation()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) })

  function togglePermission(key: PermissionKey) {
    setPermissions((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    )
  }

  async function onSubmit(values: FormValues) {
    if (permissions.length === 0) {
      toast.error('Grant at least one permission', {
        description: 'An account with no permissions can sign in but do nothing.',
      })
      return
    }

    try {
      const result = await invite.mutateAsync({ email: values.email, permissions })
      setIssued({ email: result.email, token: result.token, expiresAt: result.expiresAt })
      setCopied(false)
      reset()
      setPermissions([])
      router.refresh()
    } catch (error) {
      toast.error('Could not create the invite', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    }
  }

  async function copyToken() {
    if (!issued) return
    try {
      await navigator.clipboard.writeText(issued.token)
      setCopied(true)
      toast.success('Invite code copied')
    } catch {
      toast.error('Could not copy — select the code and copy it manually.')
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Field
          label="Email address"
          htmlFor="invite-email"
          required
          hint="Use their own work address — never share a shared login"
          error={errors.email?.message}
        >
          <Input id="invite-email" type="email" autoComplete="off" {...register('email')} />
        </Field>

        <fieldset className="space-y-4">
          <legend className="text-sm font-medium">What can they do?</legend>

          {PERMISSION_GROUPS.map((group) => (
            <div key={group.label} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
              {group.keys.map((key) => (
                <label
                  key={key}
                  htmlFor={`invite-perm-${key}`}
                  className="flex cursor-pointer items-start gap-2.5 py-1"
                >
                  <Checkbox
                    id={`invite-perm-${key}`}
                    checked={permissions.includes(key)}
                    onCheckedChange={() => togglePermission(key)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block text-sm">{PERMISSIONS[key]}</span>
                    <span className="block font-mono text-[11px] text-muted-foreground">{key}</span>
                  </span>
                </label>
              ))}
            </div>
          ))}
        </fieldset>

        <Button type="submit" loading={invite.isPending}>
          <UserPlus aria-hidden />
          Create invite
        </Button>
      </form>

      {issued && (
        <div className="rounded-md border border-espresso-300 bg-espresso-50 p-4">
          <p className="text-sm font-semibold">Invite created for {issued.email}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Expires {formatDate(issued.expiresAt)}.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-card px-3 py-2 font-mono text-xs">
              {issued.token}
            </code>
            <Button type="button" variant="outline" size="sm" onClick={copyToken}>
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-foreground">
            <strong className="font-semibold">There is no invite page yet</strong>, so this code
            can’t be redeemed on its own — a developer still has to build that step, or create the
            account directly. Treat the code like a password: send it over a channel only that
            person can read, never a shared group.
          </p>
        </div>
      )}
    </div>
  )
}
