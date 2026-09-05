'use client'

import { SlidersHorizontal, X } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { buildCatalogHref } from '@/modules/catalog/search-params'
import { cn } from '@/lib/utils'

export interface FacetOption {
  id: string
  name: string
  isSwatch: boolean
  values: { id: string; value: string; swatchHex: string | null }[]
}

interface FilterProps {
  facets: FacetOption[]
  priceBounds: { min: number; max: number }
  activeOptions: Record<string, string[]>
  activeFilterCount: number
}

const SORT_LABELS: Record<string, string> = {
  newest: 'Newest first',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  'name-asc': 'Name: A to Z',
}

function useFilterNavigation() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function apply(changes: Record<string, string | string[] | null>) {
    const href = buildCatalogHref(pathname, new URLSearchParams(params.toString()), changes)
    startTransition(() => router.push(href, { scroll: false }))
  }

  return { apply, params, pathname, isPending }
}

export function SortSelect() {
  const { apply, params } = useFilterNavigation()
  const current = params.get('sort') ?? 'newest'

  return (
    <Select value={current} onValueChange={(value) => apply({ sort: value })}>
      <SelectTrigger className="w-[190px]" aria-label="Sort products">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(SORT_LABELS).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function FilterBody({ facets, priceBounds, activeOptions }: Omit<FilterProps, 'activeFilterCount'>) {
  const { apply, params } = useFilterNavigation()
  const [minPrice, setMinPrice] = useState(params.get('minPrice') ?? '')
  const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') ?? '')
  const inStockOnly = params.get('inStock') === '1'

  function toggleOptionValue(optionName: string, value: string) {
    const current = activeOptions[optionName] ?? []
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    apply({ [optionName]: next.length > 0 ? next : null })
  }

  return (
    <div className="space-y-7">
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Availability</legend>
        <label className="flex cursor-pointer items-center gap-2.5 py-1 text-sm text-muted-foreground">
          <Checkbox
            checked={inStockOnly}
            onCheckedChange={(checked) => apply({ inStock: checked ? '1' : null })}
          />
          In stock only
        </label>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Price</legend>
        <p className="text-xs text-muted-foreground">
          ₹{Math.floor(priceBounds.min)} – ₹{Math.ceil(priceBounds.max)}
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Label htmlFor="minPrice" className="sr-only">
              Minimum price
            </Label>
            <Input
              id="minPrice"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="h-10"
            />
          </div>
          <span className="text-muted-foreground">–</span>
          <div className="flex-1">
            <Label htmlFor="maxPrice" className="sr-only">
              Maximum price
            </Label>
            <Input
              id="maxPrice"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="h-10"
            />
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => apply({ minPrice: minPrice || null, maxPrice: maxPrice || null })}
        >
          Apply price
        </Button>
      </fieldset>

      {facets.map((facet) => {
        const selected = activeOptions[facet.name] ?? []

        return (
          <fieldset key={facet.id} className="space-y-3">
            <legend className="text-sm font-semibold">{facet.name}</legend>

            {facet.isSwatch ? (
              <div className="flex flex-wrap gap-2">
                {facet.values.map((value) => {
                  const isSelected = selected.includes(value.value)
                  return (
                    <button
                      key={value.id}
                      type="button"
                      onClick={() => toggleOptionValue(facet.name, value.value)}
                      aria-pressed={isSelected}
                      title={value.value}
                      className={cn(
                        'flex items-center gap-2 rounded-full border px-3 py-2 text-xs transition-colors',
                        isSelected
                          ? 'border-espresso-800 bg-espresso-50'
                          : 'border-border hover:border-espresso-400',
                      )}
                    >
                      <span
                        aria-hidden
                        className="size-4 rounded-full border border-espresso-200"
                        style={{ backgroundColor: value.swatchHex ?? 'transparent' }}
                      />
                      {value.value}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {facet.values.map((value) => {
                  const isSelected = selected.includes(value.value)
                  return (
                    <button
                      key={value.id}
                      type="button"
                      onClick={() => toggleOptionValue(facet.name, value.value)}
                      aria-pressed={isSelected}
                      className={cn(
                        'min-w-11 rounded-md border px-3 py-2 text-xs transition-colors',
                        isSelected
                          ? 'border-espresso-800 bg-espresso-800 text-cream-50'
                          : 'border-border hover:border-espresso-400',
                      )}
                    >
                      {value.value}
                    </button>
                  )
                })}
              </div>
            )}
          </fieldset>
        )
      })}
    </div>
  )
}

export function FilterSidebar(props: FilterProps) {
  const { apply } = useFilterNavigation()

  return (
    <aside className="hidden w-60 shrink-0 lg:block" aria-label="Product filters">
      <div className="sticky top-24 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Filters</h2>
          {props.activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() =>
                apply({
                  minPrice: null,
                  maxPrice: null,
                  inStock: null,
                  ...Object.fromEntries(props.facets.map((facet) => [facet.name, null])),
                })
              }
              className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Clear all
            </button>
          )}
        </div>
        <FilterBody {...props} />
      </div>
    </aside>
  )
}

export function FilterDrawer(props: FilterProps) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex h-11 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium lg:hidden">
        <SlidersHorizontal className="size-4" aria-hidden />
        Filters
        {props.activeFilterCount > 0 && (
          <span className="ml-0.5 rounded-full bg-espresso-800 px-1.5 text-[10px] leading-4 text-cream-50">
            {props.activeFilterCount}
          </span>
        )}
      </SheetTrigger>

      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto p-0">
        <SheetHeader className="sticky top-0 flex-row items-center justify-between border-b border-border bg-card px-5 py-4">
          <SheetTitle>Filters</SheetTitle>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close filters"
            className="rounded-md p-2 hover:bg-espresso-100"
          >
            <X className="size-5" aria-hidden />
          </button>
        </SheetHeader>

        <div className="px-5 py-5">
          <FilterBody {...props} />
        </div>

        <div className="sticky bottom-0 border-t border-border bg-card px-5 py-4">
          <Button block onClick={() => setOpen(false)}>
            Show results
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
