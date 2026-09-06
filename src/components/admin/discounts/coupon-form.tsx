'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { formatDate, formatInrCompact } from '@/lib/format'
import { api } from '@/trpc/react'

/**
 * Numbers and dates arrive from the DOM as strings, so the form validates
 * strings and converts once, on submit. The router's own schema then
 * re-validates the real types server-side.
 */
const amount = (message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || (Number.isFinite(Number(v)) && Number(v) >= 0), message)

const wholeNumber = (message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || (Number.isInteger(Number(v)) && Number(v) >= 1), message)

const couponFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, 'Codes are at least 3 characters')
      .max(40)
      .regex(/^[A-Z0-9][A-Z0-9_-]*$/, 'Uppercase letters, digits, dashes and underscores only'),
    description: z.string().trim().max(200),
    type: z.enum(['PERCENTAGE', 'FLAT']),
    value: z
      .string()
      .trim()
      .min(1, 'Enter a value')
      .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, 'Enter a value above zero'),
    minOrderValue: amount('Enter a valid minimum order value'),
    maxDiscountAmount: amount('Enter a valid cap'),
    startsAt: z.string(),
    expiresAt: z.string(),
    usageLimitTotal: wholeNumber('Enter a whole number of uses, or leave blank'),
    usageLimitPerCustomer: wholeNumber('Enter a whole number of uses, or leave blank'),
    isActive: z.boolean(),
  })
  .superRefine((input, ctx) => {
    if (input.type === 'PERCENTAGE' && Number(input.value) > 100) {
      ctx.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'A percentage discount cannot exceed 100',
      })
    }

    if (input.startsAt && input.expiresAt && input.startsAt >= input.expiresAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['expiresAt'],
        message: 'The end date must come after the start date',
      })
    }
  })

type CouponFormValues = z.infer<typeof couponFormSchema>

export interface CouponFormProps {
  coupon?: {
    id: string
    code: string
    description: string | null
    type: 'PERCENTAGE' | 'FLAT'
    value: number
    minOrderValue: number | null
    maxDiscountAmount: number | null
    startsAt: Date | null
    expiresAt: Date | null
    usageLimitTotal: number | null
    usageLimitPerCustomer: number | null
    usedCount: number
    isActive: boolean
  }
}

function toDateInput(value: Date | null | undefined): string {
  if (!value) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

const optionalNumber = (value: string): number | null =>
  value.trim() === '' ? null : Number(value)

/** A start date opens at midnight; an end date stays valid through that whole day. */
const startOfDay = (value: string): Date | null => (value ? new Date(`${value}T00:00:00`) : null)
const endOfDay = (value: string): Date | null => (value ? new Date(`${value}T23:59:59`) : null)

function describeCoupon(values: CouponFormValues): string {
  const numericValue = Number(values.value)
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return 'Fill in a discount value to see what this coupon does.'
  }

  const parts: string[] = [
    values.type === 'PERCENTAGE' ? `${numericValue}% off` : `${formatInrCompact(numericValue)} off`,
  ]

  const min = optionalNumber(values.minOrderValue)
  parts.push(min && min > 0 ? `orders over ${formatInrCompact(min)}` : 'any order')

  const cap = optionalNumber(values.maxDiscountAmount)
  if (values.type === 'PERCENTAGE' && cap && cap > 0) {
    parts.push(`capped at ${formatInrCompact(cap)}`)
  }

  const starts = startOfDay(values.startsAt)
  if (starts) parts.push(`from ${formatDate(starts)}`)

  const expires = endOfDay(values.expiresAt)
  parts.push(expires ? `expires ${formatDate(expires)}` : 'no end date')

  const total = optionalNumber(values.usageLimitTotal)
  if (total) parts.push(`${total} use${total === 1 ? '' : 's'} in total`)

  const perCustomer = optionalNumber(values.usageLimitPerCustomer)
  if (perCustomer) parts.push(`${perCustomer} per customer`)

  return `${parts.join(', ')}.`
}

export function CouponForm({ coupon }: CouponFormProps) {
  const router = useRouter()
  const upsert = api.discounts.upsert.useMutation()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CouponFormValues>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: {
      code: coupon?.code ?? '',
      description: coupon?.description ?? '',
      type: coupon?.type ?? 'PERCENTAGE',
      value: coupon ? String(coupon.value) : '',
      minOrderValue:
        coupon?.minOrderValue === null || coupon === undefined ? '' : String(coupon.minOrderValue),
      maxDiscountAmount:
        coupon?.maxDiscountAmount === null || coupon === undefined
          ? ''
          : String(coupon.maxDiscountAmount),
      startsAt: toDateInput(coupon?.startsAt),
      expiresAt: toDateInput(coupon?.expiresAt),
      usageLimitTotal:
        coupon?.usageLimitTotal === null || coupon === undefined
          ? ''
          : String(coupon.usageLimitTotal),
      usageLimitPerCustomer:
        coupon?.usageLimitPerCustomer === null || coupon === undefined
          ? ''
          : String(coupon.usageLimitPerCustomer),
      isActive: coupon?.isActive ?? true,
    },
  })

  const values = watch()
  const isPercentage = values.type === 'PERCENTAGE'
  const codeField = register('code')

  async function onSubmit(formValues: CouponFormValues) {
    try {
      await upsert.mutateAsync({
        ...(coupon ? { id: coupon.id } : {}),
        code: formValues.code,
        description: formValues.description.trim() === '' ? null : formValues.description.trim(),
        type: formValues.type,
        value: Number(formValues.value),
        minOrderValue: optionalNumber(formValues.minOrderValue),
        // A cap only means something for a percentage discount.
        maxDiscountAmount: isPercentage ? optionalNumber(formValues.maxDiscountAmount) : null,
        startsAt: startOfDay(formValues.startsAt),
        expiresAt: endOfDay(formValues.expiresAt),
        usageLimitTotal: optionalNumber(formValues.usageLimitTotal),
        usageLimitPerCustomer: optionalNumber(formValues.usageLimitPerCustomer),
        isActive: formValues.isActive,
      })

      toast.success(coupon ? 'Coupon updated' : 'Coupon created', {
        description: formValues.code,
      })
      router.push('/admin/discounts')
      router.refresh()
    } catch (error) {
      toast.error('Could not save the coupon', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="grid gap-5 md:grid-cols-2">
        <Field
          label="Code"
          htmlFor="code"
          required
          hint="What the shopper types at checkout"
          error={errors.code?.message}
        >
          <Input
            id="code"
            autoCapitalize="characters"
            placeholder="WELCOME10"
            {...codeField}
            onChange={(event) => {
              event.target.value = event.target.value.toUpperCase()
              void codeField.onChange(event)
            }}
          />
        </Field>

        <Field
          label="Internal description"
          htmlFor="description"
          hint="Only staff see this"
          error={errors.description?.message}
        >
          <Input
            id="description"
            placeholder="Launch offer for new customers"
            {...register('description')}
          />
        </Field>
      </div>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-medium">Discount type</legend>
        <RadioGroup
          value={values.type}
          onValueChange={(next) =>
            setValue('type', next as CouponFormValues['type'], { shouldValidate: true })
          }
          className="grid gap-3 sm:grid-cols-2"
        >
          <label
            htmlFor="coupon-type-percentage"
            className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-card)] border p-4 transition-colors ${
              isPercentage ? 'border-espresso-800 bg-espresso-50' : 'border-border'
            }`}
          >
            <RadioGroupItem id="coupon-type-percentage" value="PERCENTAGE" className="mt-0.5" />
            <span>
              <span className="block text-sm font-medium">Percentage off</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Takes a share of the order, e.g. 20% off.
              </span>
            </span>
          </label>

          <label
            htmlFor="coupon-type-flat"
            className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-card)] border p-4 transition-colors ${
              isPercentage ? 'border-border' : 'border-espresso-800 bg-espresso-50'
            }`}
          >
            <RadioGroupItem id="coupon-type-flat" value="FLAT" className="mt-0.5" />
            <span>
              <span className="block text-sm font-medium">Flat amount off</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Takes a fixed rupee amount, e.g. ₹300 off.
              </span>
            </span>
          </label>
        </RadioGroup>
      </fieldset>

      <div className="grid gap-5 md:grid-cols-3">
        <Field
          label={isPercentage ? 'Percentage' : 'Amount off'}
          htmlFor="value"
          required
          hint={isPercentage ? 'Between 1 and 100' : 'In rupees'}
          error={errors.value?.message}
        >
          <Input
            id="value"
            inputMode="decimal"
            placeholder={isPercentage ? '20' : '300'}
            {...register('value')}
          />
        </Field>

        <Field
          label="Minimum order value"
          htmlFor="minOrderValue"
          hint="Leave blank to allow any order"
          error={errors.minOrderValue?.message}
        >
          <Input
            id="minOrderValue"
            inputMode="decimal"
            placeholder="999"
            {...register('minOrderValue')}
          />
        </Field>

        <Field
          label="Maximum discount"
          htmlFor="maxDiscountAmount"
          hint={
            isPercentage
              ? 'Caps a percentage discount, e.g. 20% but never more than ₹500'
              : 'Not used for a flat discount — the amount off is already fixed'
          }
          error={errors.maxDiscountAmount?.message}
        >
          <Input
            id="maxDiscountAmount"
            inputMode="decimal"
            placeholder="500"
            disabled={!isPercentage}
            {...register('maxDiscountAmount')}
          />
        </Field>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Field
          label="Starts on"
          htmlFor="startsAt"
          hint="Leave blank to start immediately"
          error={errors.startsAt?.message}
        >
          <Input id="startsAt" type="date" {...register('startsAt')} />
        </Field>

        <Field
          label="Expires on"
          htmlFor="expiresAt"
          hint="Valid through the end of this day. Leave blank for no end date."
          error={errors.expiresAt?.message}
        >
          <Input id="expiresAt" type="date" {...register('expiresAt')} />
        </Field>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Field
          label="Total uses allowed"
          htmlFor="usageLimitTotal"
          hint="Across all customers. Leave blank for unlimited."
          error={errors.usageLimitTotal?.message}
        >
          <Input
            id="usageLimitTotal"
            inputMode="numeric"
            placeholder="100"
            {...register('usageLimitTotal')}
          />
        </Field>

        <Field
          label="Uses per customer"
          htmlFor="usageLimitPerCustomer"
          hint="Leave blank for unlimited"
          error={errors.usageLimitPerCustomer?.message}
        >
          <Input
            id="usageLimitPerCustomer"
            inputMode="numeric"
            placeholder="1"
            {...register('usageLimitPerCustomer')}
          />
        </Field>
      </div>

      <label htmlFor="coupon-active" className="flex min-h-11 cursor-pointer items-center gap-3">
        <Checkbox
          id="coupon-active"
          checked={values.isActive}
          onCheckedChange={(checked) => setValue('isActive', checked === true)}
        />
        <span>
          {/* A plain span, not <Label>: the wrapping <label> already names the checkbox. */}
          <span className="block text-sm font-medium text-foreground">Active</span>
          <span className="block text-xs text-muted-foreground">
            Inactive coupons are rejected at checkout even inside their date window.
          </span>
        </span>
      </label>

      <div className="rounded-[var(--radius-card)] border border-border bg-espresso-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          What this coupon does
        </p>
        <p className="mt-2 text-sm">{describeCoupon(values)}</p>
        {coupon && coupon.usedCount > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Already used {coupon.usedCount} time{coupon.usedCount === 1 ? '' : 's'}.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" loading={isSubmitting}>
          {coupon ? 'Save changes' : 'Create coupon'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/admin/discounts')}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
