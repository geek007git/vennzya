'use client'

import { Search } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/trpc/react'

const ALL = 'ALL'

function useFilterNav() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function apply(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString())
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    // Any filter change invalidates the cursor we were paging from.
    next.delete('cursor')
    const query = next.toString()
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname))
  }

  return { apply, params, isPending }
}

export function ProductListControls() {
  const { apply, params } = useFilterNav()
  const [query, setQuery] = useState(params.get('q') ?? '')

  const status = params.get('status') ?? ALL
  const lowStockOnly = params.get('low') === '1'

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          apply({ q: query.trim() || null })
        }}
        className="relative flex-1"
      >
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or SKU"
          aria-label="Search products"
          className="pl-9"
        />
      </form>

      <Select
        value={status}
        onValueChange={(value) => apply({ status: value === ALL ? null : value })}
      >
        <SelectTrigger className="sm:w-44" aria-label="Filter by status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="DRAFT">Draft</SelectItem>
          <SelectItem value="ARCHIVED">Archived</SelectItem>
        </SelectContent>
      </Select>

      <label
        htmlFor="low-stock-filter"
        className="flex min-h-11 cursor-pointer items-center gap-2.5 whitespace-nowrap text-sm"
      >
        <Checkbox
          id="low-stock-filter"
          checked={lowStockOnly}
          onCheckedChange={(checked) => apply({ low: checked === true ? '1' : null })}
        />
        Low stock only
      </label>
    </div>
  )
}

export function ProductStatusControl({
  productId,
  status,
}: {
  productId: string
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
}) {
  const router = useRouter()

  const setStatus = api.catalogAdmin.setStatus.useMutation({
    onSuccess: (result) => {
      toast.success(
        result.status === 'ACTIVE'
          ? 'Published to the shop'
          : `Moved to ${result.status.toLowerCase()}`,
      )
      router.refresh()
    },
    onError: (error) => toast.error('Could not change the status', { description: error.message }),
  })

  return (
    <Select
      value={status}
      disabled={setStatus.isPending}
      onValueChange={(value) =>
        setStatus.mutate({ productId, status: value as 'DRAFT' | 'ACTIVE' | 'ARCHIVED' })
      }
    >
      <SelectTrigger className="h-9 w-32" aria-label="Change status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ACTIVE">Active</SelectItem>
        <SelectItem value="DRAFT">Draft</SelectItem>
        <SelectItem value="ARCHIVED">Archived</SelectItem>
      </SelectContent>
    </Select>
  )
}
