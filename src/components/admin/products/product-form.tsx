'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { AdminCard } from '@/components/admin/kit'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { slugify } from '@/lib/utils'
import { productUpsertInput } from '@/modules/catalog/schema'
import { api } from '@/trpc/react'
import { ImageEditor } from './image-editor'
import type {
  CategoryChoice,
  OptionAxis,
  ProductFormInput,
  ProductFormOutput,
} from './product-form-schema'
import { VariantEditor } from './variant-editor'

/** RHF calls this with the default value too, which may already be null. */
const emptyToNull = {
  setValueAs: (value: unknown) => {
    if (typeof value !== 'string') return value ?? null
    return value.trim() === '' ? null : value
  },
}

export const BLANK_PRODUCT: ProductFormInput = {
  name: '',
  slug: '',
  description: '',
  shortDescription: null,
  status: 'DRAFT',
  hsnCode: '',
  gstRatePercent: 5,
  brand: null,
  careInstructions: null,
  seoTitle: null,
  seoDescription: null,
  isFeatured: false,
  categoryIds: [],
  optionIds: [],
  images: [],
  variants: [
    {
      sku: '',
      price: 0,
      compareAtPrice: null,
      stockQuantity: 0,
      lowStockThreshold: 5,
      weightGrams: null,
      isActive: true,
      optionValueIds: [],
    },
  ],
}

export function ProductForm({
  mode,
  defaultValues,
  categories,
  options,
}: {
  mode: 'create' | 'edit'
  defaultValues: ProductFormInput
  categories: CategoryChoice[]
  options: OptionAxis[]
}) {
  const router = useRouter()
  const [slugEdited, setSlugEdited] = useState(mode === 'edit')

  const form = useForm<ProductFormInput, unknown, ProductFormOutput>({
    resolver: zodResolver(productUpsertInput),
    defaultValues,
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = form

  const selectedCategoryIds = watch('categoryIds') ?? []
  const status = watch('status') ?? 'DRAFT'
  const isFeatured = watch('isFeatured') === true

  const upsert = api.catalog.upsert.useMutation({
    onSuccess: () => {
      toast.success(mode === 'create' ? 'Product created' : 'Product saved')
      router.refresh()
      if (mode === 'create') router.push('/admin/products')
    },
    onError: (error) => {
      toast.error('Could not save the product', { description: error.message })
    },
  })

  function toggleCategory(categoryId: string, checked: boolean) {
    const next = checked
      ? [...selectedCategoryIds, categoryId]
      : selectedCategoryIds.filter((id) => id !== categoryId)
    setValue('categoryIds', next, { shouldDirty: true, shouldValidate: true })
  }

  const parents = categories.filter((category) => category.parentId === null)

  return (
    <FormProvider {...form}>
      <form
        onSubmit={handleSubmit((values) => upsert.mutateAsync(values).catch(() => undefined))}
        className="space-y-6 pb-24"
      >
        <AdminCard title="Basics">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name" htmlFor="name" required error={errors.name?.message}>
              <Input
                id="name"
                {...register('name', {
                  onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                    if (!slugEdited) {
                      setValue('slug', slugify(event.target.value), { shouldValidate: true })
                    }
                  },
                })}
              />
            </Field>

            <Field
              label="URL slug"
              htmlFor="slug"
              required
              hint="Appears in the product link"
              error={errors.slug?.message}
            >
              <Input id="slug" {...register('slug', { onChange: () => setSlugEdited(true) })} />
            </Field>

            <Field
              label="Short description"
              htmlFor="shortDescription"
              hint="One line, shown under the product name"
              className="md:col-span-2"
              error={errors.shortDescription?.message}
            >
              <Input id="shortDescription" {...register('shortDescription', emptyToNull)} />
            </Field>

            <Field
              label="Description"
              htmlFor="description"
              required
              className="md:col-span-2"
              error={errors.description?.message}
            >
              <Textarea id="description" rows={6} {...register('description')} />
            </Field>

            <Field label="Brand" htmlFor="brand" error={errors.brand?.message}>
              <Input id="brand" {...register('brand', emptyToNull)} />
            </Field>

            <Field
              label="Status"
              htmlFor="status"
              hint="Only Active products appear in the shop"
              error={errors.status?.message}
            >
              <Select
                value={status}
                onValueChange={(value) =>
                  setValue('status', value as ProductFormInput['status'], { shouldDirty: true })
                }
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Care instructions"
              htmlFor="careInstructions"
              className="md:col-span-2"
              error={errors.careInstructions?.message}
            >
              <Textarea
                id="careInstructions"
                rows={3}
                {...register('careInstructions', emptyToNull)}
              />
            </Field>

            <label
              htmlFor="isFeatured"
              className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm md:col-span-2"
            >
              <Checkbox
                id="isFeatured"
                checked={isFeatured}
                onCheckedChange={(checked) =>
                  setValue('isFeatured', checked === true, { shouldDirty: true })
                }
              />
              Feature this piece on the homepage
            </label>
          </div>
        </AdminCard>

        <AdminCard title="Categories" description="A product needs at least one.">
          <div className="space-y-4">
            {parents.map((parent) => {
              const children = categories.filter((category) => category.parentId === parent.id)
              return (
                <div key={parent.id}>
                  <label
                    htmlFor={`category-${parent.id}`}
                    className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-medium"
                  >
                    <Checkbox
                      id={`category-${parent.id}`}
                      checked={selectedCategoryIds.includes(parent.id)}
                      onCheckedChange={(checked) => toggleCategory(parent.id, checked === true)}
                    />
                    {parent.name}
                  </label>
                  {children.length > 0 && (
                    <div className="ml-6 flex flex-wrap gap-x-6">
                      {children.map((child) => (
                        <label
                          key={child.id}
                          htmlFor={`category-${child.id}`}
                          className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-muted-foreground"
                        >
                          <Checkbox
                            id={`category-${child.id}`}
                            checked={selectedCategoryIds.includes(child.id)}
                            onCheckedChange={(checked) =>
                              toggleCategory(child.id, checked === true)
                            }
                          />
                          {child.name}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {errors.categoryIds?.message && (
              <p role="alert" className="text-xs text-destructive">
                {errors.categoryIds.message}
              </p>
            )}
          </div>
        </AdminCard>

        <AdminCard title="Tax" description="Drives the GST split on every invoice.">
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="HSN code"
              htmlFor="hsnCode"
              required
              hint="4–8 digits. Apparel 6204, imitation jewellery 7117, bags 4202."
              error={errors.hsnCode?.message}
            >
              <Input id="hsnCode" inputMode="numeric" {...register('hsnCode')} />
            </Field>

            <Field
              label="GST rate (%)"
              htmlFor="gstRatePercent"
              required
              hint="Prices are GST-inclusive, so this splits out of the price."
              error={errors.gstRatePercent?.message}
            >
              <Input
                id="gstRatePercent"
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                max={28}
                {...register('gstRatePercent', { valueAsNumber: true })}
              />
            </Field>
          </div>
        </AdminCard>

        <AdminCard title="Variants" description="Sizes, colours and everything else that varies.">
          <VariantEditor options={options} />
        </AdminCard>

        <AdminCard title="Images">
          <ImageEditor />
        </AdminCard>

        <AdminCard title="Search engine listing">
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="SEO title"
              htmlFor="seoTitle"
              hint="Up to 70 characters"
              error={errors.seoTitle?.message}
            >
              <Input id="seoTitle" {...register('seoTitle', emptyToNull)} />
            </Field>
            <Field
              label="SEO description"
              htmlFor="seoDescription"
              hint="Up to 180 characters"
              error={errors.seoDescription?.message}
            >
              <Input id="seoDescription" {...register('seoDescription', emptyToNull)} />
            </Field>
          </div>
        </AdminCard>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card px-4 py-3 lg:pl-64">
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => router.push('/admin/products')}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting || upsert.isPending}>
              {mode === 'create' ? 'Create product' : 'Save changes'}
            </Button>
          </div>
        </div>
      </form>
    </FormProvider>
  )
}
