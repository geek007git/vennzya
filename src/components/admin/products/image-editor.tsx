'use client'

import { ImageOff, Plus, Star, Trash2 } from 'lucide-react'
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { ProductFormInput } from './product-form-schema'

export function ImageEditor() {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useFormContext<ProductFormInput>()

  const { fields, append, remove } = useFieldArray({ control, name: 'images' })
  const images = useWatch({ control, name: 'images' }) ?? []

  function makePrimary(index: number) {
    images.forEach((_, i) => {
      setValue(`images.${i}.isPrimary`, i === index, { shouldDirty: true })
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Paste an image URL — there’s no upload yet, so images must already be hosted (Cloudinary
        isn’t configured). The starred image is the one shoppers see first.
      </p>

      {fields.length === 0 && (
        <div className="flex items-center gap-3 rounded-md border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
          <ImageOff className="size-4" aria-hidden />
          No images yet — the product will show a grey placeholder.
        </div>
      )}

      <div className="space-y-3">
        {fields.map((field, index) => {
          const url = images[index]?.url ?? ''
          const isPrimary = images[index]?.isPrimary === true

          return (
            <div
              key={field.id}
              className="flex gap-3 rounded-[var(--radius-card)] border border-border bg-background p-3"
            >
              <div className="size-20 shrink-0 overflow-hidden rounded-md bg-espresso-100">
                {url ? (
                  // A pasted URL can point anywhere, so next/image (which needs
                  // an allow-listed host) would throw. Plain img is correct here.
                  // biome-ignore lint/performance/noImgElement: arbitrary pasted host
                  <img
                    src={url}
                    alt=""
                    className="size-full object-cover"
                    onError={(event) => {
                      event.currentTarget.style.visibility = 'hidden'
                    }}
                  />
                ) : null}
              </div>

              <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                <Field
                  label="Image URL"
                  htmlFor={`image-${index}-url`}
                  required
                  className="sm:col-span-2"
                  error={errors.images?.[index]?.url?.message}
                >
                  <Input
                    id={`image-${index}-url`}
                    placeholder="https://res.cloudinary.com/…"
                    {...register(`images.${index}.url`)}
                  />
                </Field>

                <Field
                  label="Alt text"
                  htmlFor={`image-${index}-alt`}
                  hint="Describes the photo for screen readers"
                  error={errors.images?.[index]?.altText?.message}
                >
                  <Input id={`image-${index}-alt`} {...register(`images.${index}.altText`)} />
                </Field>

                <Field
                  label="Sort order"
                  htmlFor={`image-${index}-sort`}
                  error={errors.images?.[index]?.sortOrder?.message}
                >
                  <Input
                    id={`image-${index}-sort`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    {...register(`images.${index}.sortOrder`, { valueAsNumber: true })}
                  />
                </Field>
              </div>

              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  onClick={() => makePrimary(index)}
                  aria-label={`Use image ${index + 1} as the main image`}
                  aria-pressed={isPrimary}
                  className={cn(
                    'inline-flex size-11 items-center justify-center rounded-md transition-colors hover:bg-espresso-100',
                    isPrimary ? 'text-espresso-800' : 'text-muted-foreground',
                  )}
                >
                  <Star className={cn('size-4', isPrimary && 'fill-current')} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label={`Remove image ${index + 1}`}
                  className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-espresso-100 hover:text-destructive"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          append({
            url: '',
            altText: null,
            sortOrder: fields.length,
            isPrimary: fields.length === 0,
          })
        }
      >
        <Plus aria-hidden />
        Add image
      </Button>
    </div>
  )
}
