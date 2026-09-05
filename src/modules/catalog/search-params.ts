import { PRODUCT_SORTS, type ProductListInput, type ProductSort } from './schema'

/**
 * Translates between the storefront URL and the catalogue query.
 * Filters live in the URL so a filtered view is shareable, bookmarkable and
 * crawlable — never in component state.
 */

export type RawSearchParams = Record<string, string | string[] | undefined>

/** Query keys that are not option facets. */
const RESERVED = new Set(['q', 'sort', 'page', 'minPrice', 'maxPrice', 'inStock', 'category', 'collection'])

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function all(value: string | string[] | undefined): string[] {
  if (value === undefined) return []
  return Array.isArray(value) ? value : value.split(',').filter(Boolean)
}

function positiveNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

export interface ParsedCatalogParams {
  query: ProductListInput
  /** Option facets keyed by option name, e.g. { Size: ['M'], Colour: ['Sand'] } */
  activeOptions: Record<string, string[]>
  activeFilterCount: number
}

export function parseCatalogParams(
  params: RawSearchParams,
  overrides: { category?: string; limit?: number } = {},
): ParsedCatalogParams {
  const activeOptions: Record<string, string[]> = {}

  for (const [key, value] of Object.entries(params)) {
    if (RESERVED.has(key)) continue
    const values = all(value)
    if (values.length > 0) activeOptions[key] = values
  }

  const sortParam = first(params.sort)
  const sort: ProductSort = PRODUCT_SORTS.includes(sortParam as ProductSort)
    ? (sortParam as ProductSort)
    : 'newest'

  const minPrice = positiveNumber(first(params.minPrice))
  const maxPrice = positiveNumber(first(params.maxPrice))
  const category = overrides.category ?? first(params.category)
  const collection = first(params.collection)
  const inStockOnly = first(params.inStock) === '1'
  const pageNumber = Number(first(params.page) ?? '1')

  const query: ProductListInput = {
    ...(first(params.q) ? { q: first(params.q) as string } : {}),
    ...(category ? { category } : {}),
    ...(collection ? { collection } : {}),
    ...(Object.keys(activeOptions).length > 0 ? { options: activeOptions } : {}),
    ...(minPrice !== undefined ? { minPrice } : {}),
    ...(maxPrice !== undefined ? { maxPrice } : {}),
    inStockOnly,
    featuredOnly: false,
    sort,
    limit: overrides.limit ?? 24,
    page: Number.isFinite(pageNumber) && pageNumber >= 1 ? Math.floor(pageNumber) : 1,
  }

  const activeFilterCount =
    Object.values(activeOptions).reduce((sum, values) => sum + values.length, 0) +
    (minPrice !== undefined || maxPrice !== undefined ? 1 : 0) +
    (inStockOnly ? 1 : 0)

  return { query, activeOptions, activeFilterCount }
}

/** Builds a URL preserving current filters, with the given changes applied. */
export function buildCatalogHref(
  basePath: string,
  current: URLSearchParams,
  changes: Record<string, string | string[] | null>,
): string {
  const next = new URLSearchParams(current)

  for (const [key, value] of Object.entries(changes)) {
    next.delete(key)
    if (value === null) continue
    if (Array.isArray(value)) {
      for (const item of value) next.append(key, item)
    } else {
      next.set(key, value)
    }
  }

  // Any filter change invalidates the current page position.
  if (!('page' in changes)) next.delete('page')

  const queryString = next.toString()
  return queryString ? `${basePath}?${queryString}` : basePath
}
