'use client'

import { Plus, Trash2 } from 'lucide-react'
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, Label } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { OptionAxis, ProductFormInput } from './product-form-schema'

/** RHF calls this with the default value too, which may already be null. */
const nullableNumber = {
  setValueAs: (value: unknown) => {
    if (value === null || value === undefined) return null
    if (typeof value === 'number') return value
    return String(value).trim() === '' ? null : Number(value)
  },
}

/**
 * A variant is one sellable combination. The rows are driven by which option
 * axes the product uses, so picking "Size" adds a Size cell to every row
 * rather than making the user retype the whole matrix.
 */
export function VariantEditor({ options }: { options: OptionAxis[] }) {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useFormContext<ProductFormInput>()

  const { fields, append, remove } = useFieldArray({ control, name: 'variants' })
  const selectedOptionIds = useWatch({ control, name: 'optionIds' }) ?? []
  const variants = useWatch({ control, name: 'variants' }) ?? []

  const activeAxes = options.filter((option) => selectedOptionIds.includes(option.id))

  function toggleAxis(optionId: string, checked: boolean) {
    const next = checked
      ? [...selectedOptionIds, optionId]
      : selectedOptionIds.filter((id) => id !== optionId)
    setValue('optionIds', next, { shouldDirty: true })

    // Dropping an axis must also drop its values from every row, or the
    // variant keeps an invisible selection that the form can't clear.
    if (!checked) {
      const removed = options.find((option) => option.id === optionId)
      if (!removed) return
      const removedValueIds = new Set(removed.values.map((value) => value.id))

      variants.forEach((variant, index) => {
        const kept = (variant?.optionValueIds ?? []).filter((id) => !removedValueIds.has(id))
        setValue(`variants.${index}.optionValueIds`, kept, { shouldDirty: true })
      })
    }
  }

  function setAxisValue(variantIndex: number, axis: OptionAxis, valueId: string) {
    const axisValueIds = new Set(axis.values.map((value) => value.id))
    const current = variants[variantIndex]?.optionValueIds ?? []
    const withoutAxis = current.filter((id) => !axisValueIds.has(id))
    setValue(`variants.${variantIndex}.optionValueIds`, [...withoutAxis, valueId], {
      shouldDirty: true,
    })
  }

  function currentAxisValue(variantIndex: number, axis: OptionAxis): string {
    const axisValueIds = new Set(axis.values.map((value) => value.id))
    return (variants[variantIndex]?.optionValueIds ?? []).find((id) => axisValueIds.has(id)) ?? ''
  }

  return (
    <div className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Option axes</legend>
        <p className="text-xs text-muted-foreground">
          Choose what varies between versions of this piece. Clothing usually uses Size and Colour;
          jewellery uses Metal and Stone.
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {options.map((option) => (
            <label
              key={option.id}
              htmlFor={`axis-${option.id}`}
              className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm"
            >
              <Checkbox
                id={`axis-${option.id}`}
                checked={selectedOptionIds.includes(option.id)}
                onCheckedChange={(checked) => toggleAxis(option.id, checked === true)}
              />
              {option.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="rounded-[var(--radius-card)] border border-border bg-background p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Variant {index + 1}
              </p>
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
                aria-label={`Remove variant ${index + 1}`}
                className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-espresso-100 hover:text-destructive disabled:opacity-40"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>

            {activeAxes.length > 0 && (
              <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {activeAxes.map((axis) => (
                  <div key={axis.id} className="space-y-1.5">
                    <Label htmlFor={`variant-${index}-axis-${axis.id}`}>{axis.name}</Label>
                    <Select
                      value={currentAxisValue(index, axis)}
                      onValueChange={(value) => setAxisValue(index, axis, value)}
                    >
                      <SelectTrigger id={`variant-${index}-axis-${axis.id}`}>
                        <SelectValue placeholder={`Choose ${axis.name.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {axis.values.map((value) => (
                          <SelectItem key={value.id} value={value.id}>
                            {value.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field
                label="SKU"
                htmlFor={`variant-${index}-sku`}
                required
                error={errors.variants?.[index]?.sku?.message}
              >
                <Input
                  id={`variant-${index}-sku`}
                  placeholder="VFH-KUR-M-IVR"
                  {...register(`variants.${index}.sku`, {
                    setValueAs: (value: string) => value.trim().toUpperCase(),
                  })}
                />
              </Field>

              <Field
                label="Price (₹)"
                htmlFor={`variant-${index}-price`}
                required
                error={errors.variants?.[index]?.price?.message}
              >
                <Input
                  id={`variant-${index}-price`}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  {...register(`variants.${index}.price`, { valueAsNumber: true })}
                />
              </Field>

              <Field
                label="Compare at (₹)"
                htmlFor={`variant-${index}-compare`}
                hint="Optional — shown struck through"
                error={errors.variants?.[index]?.compareAtPrice?.message}
              >
                <Input
                  id={`variant-${index}-compare`}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  {...register(`variants.${index}.compareAtPrice`, nullableNumber)}
                />
              </Field>

              <Field
                label="Stock"
                htmlFor={`variant-${index}-stock`}
                required
                error={errors.variants?.[index]?.stockQuantity?.message}
              >
                <Input
                  id={`variant-${index}-stock`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  {...register(`variants.${index}.stockQuantity`, { valueAsNumber: true })}
                />
              </Field>

              <Field
                label="Low stock at"
                htmlFor={`variant-${index}-threshold`}
                hint="Warn below this level"
                error={errors.variants?.[index]?.lowStockThreshold?.message}
              >
                <Input
                  id={`variant-${index}-threshold`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  {...register(`variants.${index}.lowStockThreshold`, { valueAsNumber: true })}
                />
              </Field>

              <Field
                label="Weight (g)"
                htmlFor={`variant-${index}-weight`}
                hint="Optional — for shipping"
                error={errors.variants?.[index]?.weightGrams?.message}
              >
                <Input
                  id={`variant-${index}-weight`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  {...register(`variants.${index}.weightGrams`, nullableNumber)}
                />
              </Field>
            </div>

            <label
              htmlFor={`variant-${index}-active`}
              className="mt-3 flex min-h-11 cursor-pointer items-center gap-2.5 text-sm"
            >
              <Checkbox
                id={`variant-${index}-active`}
                checked={variants[index]?.isActive !== false}
                onCheckedChange={(checked) =>
                  setValue(`variants.${index}.isActive`, checked === true, { shouldDirty: true })
                }
              />
              Available to buy
            </label>
          </div>
        ))}
      </div>

      {errors.variants?.message && (
        <p role="alert" className="text-xs text-destructive">
          {errors.variants.message}
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          append({
            sku: '',
            price: 0,
            compareAtPrice: null,
            stockQuantity: 0,
            lowStockThreshold: 5,
            weightGrams: null,
            isActive: true,
            optionValueIds: [],
          })
        }
      >
        <Plus aria-hidden />
        Add variant
      </Button>
    </div>
  )
}
