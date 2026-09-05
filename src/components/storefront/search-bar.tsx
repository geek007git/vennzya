'use client'

import { Search, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function SearchBar({ className }: { className?: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const [value, setValue] = useState(params.get('q') ?? '')

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const query = value.trim()
    router.push(query ? `/shop?q=${encodeURIComponent(query)}` : '/shop')
  }

  return (
    <form role="search" onSubmit={submit} className={cn('relative', className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search for kurtas, earrings, bags…"
        aria-label="Search products"
        className="h-10 rounded-full border-espresso-200 bg-cream-50 pl-9 pr-3"
      />
    </form>
  )
}

/** Mobile: an icon that expands into a full-width overlay, keeping the bar uncluttered. */
export function SearchTrigger() {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [value, setValue] = useState('')

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const query = value.trim()
    setOpen(false)
    router.push(query ? `/shop?q=${encodeURIComponent(query)}` : '/shop')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        aria-expanded={open}
        className="inline-flex size-11 items-center justify-center rounded-md text-foreground transition-colors hover:bg-espresso-100 md:hidden"
      >
        <Search className="size-5" aria-hidden />
      </button>

      {open && (
        <div className="fixed inset-x-0 top-0 z-50 border-b border-border bg-card p-3 shadow-card md:hidden">
          <form role="search" onSubmit={submit} className="flex items-center gap-2">
            <Input
              ref={inputRef}
              type="search"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Search products"
              aria-label="Search products"
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close search"
              className="inline-flex size-11 items-center justify-center rounded-md hover:bg-espresso-100"
            >
              <X className="size-5" aria-hidden />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
