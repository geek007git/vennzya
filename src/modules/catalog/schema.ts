import { z } from 'zod'

export const PRODUCT_SORTS = ['newest', 'price-asc', 'price-desc', 'name-asc'] as const
export type ProductSort = (typeof PRODUCT_SORTS)[number]

/** Mirrors the storefront URL query, so a filtered page is shareable. */
export const productListInput = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().optional(),
  collection: z.string().trim().optional(),
  /** Option value slugs/labels, e.g. size=M&size=L, colour=Black */
  options: z.record(z.string(), z.array(z.string())).optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().nonnegative().optional(),
  inStockOnly: z.boolean().default(false),
  featuredOnly: z.boolean().default(false),
  sort: z.enum(PRODUCT_SORTS).default('newest'),
  limit: z.number().int().min(1).max(60).default(24),
  /** Numbered pages for the crawlable storefront grid. */
  page: z.number().int().min(1).max(500).default(1),
  /** Cursor for "load more" and admin lists; takes precedence over `page`. */
  cursor: z.string().optional(),
})

export type ProductListInput = z.infer<typeof productListInput>

export const productBySlugInput = z.object({ slug: z.string().min(1) })

export const categoryBySlugInput = z.object({ slug: z.string().min(1) })

const skuRegex = /^[A-Z0-9][A-Z0-9-]{2,31}$/

export const variantInput = z.object({
  id: z.string().optional(),
  sku: z.string().regex(skuRegex, 'Use uppercase letters, digits and dashes (3-32 chars)'),
  price: z.number().positive().max(10_000_000),
  compareAtPrice: z.number().positive().max(10_000_000).nullable().optional(),
  stockQuantity: z.number().int().min(0).max(1_000_000),
  lowStockThreshold: z.number().int().min(0).max(10_000).default(5),
  weightGrams: z.number().int().min(0).max(1_000_000).nullable().optional(),
  isActive: z.boolean().default(true),
  /** OptionValue ids that define this variant, e.g. [Size:M, Colour:Black]. */
  optionValueIds: z.array(z.string()).default([]),
})

export const productImageInput = z.object({
  id: z.string().optional(),
  url: z.string().url(),
  publicId: z.string().nullable().optional(),
  altText: z.string().max(160).nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isPrimary: z.boolean().default(false),
  variantId: z.string().nullable().optional(),
})

export const productUpsertInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(160),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, digits and dashes only'),
  description: z.string().trim().min(10).max(8000),
  shortDescription: z.string().trim().max(300).nullable().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('DRAFT'),
  hsnCode: z.string().trim().regex(/^\d{4,8}$/, 'HSN code is 4-8 digits'),
  gstRatePercent: z.number().min(0).max(28),
  brand: z.string().trim().max(80).nullable().optional(),
  careInstructions: z.string().trim().max(2000).nullable().optional(),
  seoTitle: z.string().trim().max(70).nullable().optional(),
  seoDescription: z.string().trim().max(180).nullable().optional(),
  isFeatured: z.boolean().default(false),
  categoryIds: z.array(z.string()).min(1, 'Pick at least one category'),
  optionIds: z.array(z.string()).default([]),
  variants: z.array(variantInput).min(1, 'A product needs at least one variant'),
  images: z.array(productImageInput).default([]),
})

export type ProductUpsertInput = z.infer<typeof productUpsertInput>

export const categoryUpsertInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, digits and dashes only'),
  description: z.string().trim().max(2000).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  parentId: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
  seoTitle: z.string().trim().max(70).nullable().optional(),
  seoDescription: z.string().trim().max(180).nullable().optional(),
})

export const adjustStockInput = z.object({
  variantId: z.string(),
  quantityDelta: z.number().int(),
  note: z.string().trim().max(300).optional(),
})
