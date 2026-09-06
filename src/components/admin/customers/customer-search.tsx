'use client'

import { Search, X } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/** Search lives in the URL so a filtered view can be shared or bookmarked. */
export function CustomerSearch() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [value, setValue] = useState(params.get('q') ?? '')

  function apply(next: string) {
    const query = new URLSearchParams()
    if (next.trim()) query.set('q', next.trim())
    // A new search invalidates the current page position.
    const href = query.toString() ? `${pathname}?${query}` : pathname
    startTransition(() => router.push(href))
  }

  return (
    <search className="contents">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          apply(value)
        }}
        className="flex w-full gap-2 sm:w-auto"
      >
        <div className="relative flex-1 sm:w-72">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Name, phone or email"
            aria-label="Search customers"
            className="pl-9"
          />
          {value && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setValue('')
                apply('')
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-espresso-100"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          )}
        </div>
        <Button type="submit" variant="outline" loading={isPending}>
          Search
        </Button>
      </form>
    </search>
  )
}
