import type { z } from 'zod'
import type { productUpsertInput } from '@/modules/catalog/schema'

/** Before Zod applies defaults — what the inputs actually hold. */
export type ProductFormInput = z.input<typeof productUpsertInput>
/** After validation — exactly what `catalog.upsert` accepts. */
export type ProductFormOutput = z.output<typeof productUpsertInput>

export interface OptionAxis {
  id: string
  name: string
  isSwatch: boolean
  values: { id: string; value: string; swatchHex: string | null }[]
}

export interface CategoryChoice {
  id: string
  name: string
  parentId: string | null
}
