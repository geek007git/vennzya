import { ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

/** tRPC throws with a `code` on the error object; that is all we need here. */
export function isForbidden(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code
  return code === 'FORBIDDEN' || code === 'UNAUTHORIZED'
}

export function PermissionDenied({ what }: { what: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-card px-6 py-16 text-center">
      <ShieldAlert className="mx-auto size-8 text-muted-foreground" aria-hidden />
      <h1 className="mt-4 text-lg font-semibold">You don’t have permission</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Your account can’t {what}. Ask the store owner to grant you the “Products” permission.
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/admin">Back to dashboard</Link>
      </Button>
    </div>
  )
}
