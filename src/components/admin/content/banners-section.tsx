'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { DataTable, EmptyState, humanizeStatus, StatusBadge, Td } from '@/components/admin/kit'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDate } from '@/lib/format'
import { api } from '@/trpc/react'
import { ConfirmDialog } from './confirm-dialog'

type Placement = 'ANNOUNCEMENT_BAR' | 'HOMEPAGE_HERO' | 'HOMEPAGE_SECONDARY' | 'CATEGORY_TOP'

/**
 * Declared rather than inferred from the router: pulling `inferRouterOutputs`
 * into a client component makes TypeScript materialise the whole API surface.
 */
export interface BannerRow {
  id: string
  title: string
  subtitle: string | null
  imageUrl: string | null
  linkUrl: string | null
  ctaLabel: string | null
  placement: Placement
  sortOrder: number
  isActive: boolean
  startsAt: Date | null
  endsAt: Date | null
}

type Banner = BannerRow

const PLACEMENTS = [
  { value: 'ANNOUNCEMENT_BAR', label: 'Announcement bar' },
  { value: 'HOMEPAGE_HERO', label: 'Homepage hero' },
  { value: 'HOMEPAGE_SECONDARY', label: 'Homepage secondary' },
  { value: 'CATEGORY_TOP', label: 'Top of category pages' },
] as const

/** Dates ride as strings through the form and become Date objects on submit. */
const formSchema = z.object({
  title: z.string().trim().min(2, 'Give the banner a title').max(120),
  subtitle: z.string().trim().max(240),
  imageUrl: z.string().trim().url('Enter a full image URL').or(z.literal('')),
  linkUrl: z.string().trim().max(300),
  ctaLabel: z.string().trim().max(40),
  placement: z.enum(['ANNOUNCEMENT_BAR', 'HOMEPAGE_HERO', 'HOMEPAGE_SECONDARY', 'CATEGORY_TOP']),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
  startsAt: z.string(),
  endsAt: z.string(),
})

type FormValues = z.input<typeof formSchema>

function toDateInput(value: Date | null): string {
  if (!value) return ''
  return value.toISOString().slice(0, 10)
}

function fromDateInput(value: string): Date | null {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function BannersSection({ banners }: { banners: Banner[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<Banner | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Banner | null>(null)

  const upsert = api.contentAdmin.upsertBanner.useMutation()
  const remove = api.contentAdmin.deleteBanner.useMutation()

  const current = editing === 'new' ? null : editing

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) })

  function openEditor(banner: Banner | 'new') {
    const source = banner === 'new' ? null : banner
    reset({
      title: source?.title ?? '',
      subtitle: source?.subtitle ?? '',
      imageUrl: source?.imageUrl ?? '',
      linkUrl: source?.linkUrl ?? '',
      ctaLabel: source?.ctaLabel ?? '',
      placement: source?.placement ?? 'HOMEPAGE_HERO',
      sortOrder: source?.sortOrder ?? 0,
      isActive: source?.isActive ?? true,
      startsAt: toDateInput(source?.startsAt ?? null),
      endsAt: toDateInput(source?.endsAt ?? null),
    })
    setEditing(banner)
  }

  async function onSubmit(values: FormValues) {
    const parsed = formSchema.parse(values)

    try {
      await upsert.mutateAsync({
        ...(current ? { id: current.id } : {}),
        title: parsed.title,
        subtitle: parsed.subtitle || null,
        imageUrl: parsed.imageUrl || null,
        linkUrl: parsed.linkUrl || null,
        ctaLabel: parsed.ctaLabel || null,
        placement: parsed.placement,
        sortOrder: parsed.sortOrder,
        isActive: parsed.isActive,
        startsAt: fromDateInput(parsed.startsAt),
        endsAt: fromDateInput(parsed.endsAt),
      })
      toast.success(current ? 'Banner updated' : 'Banner added')
      setEditing(null)
      router.refresh()
    } catch (error) {
      toast.error('Could not save the banner', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await remove.mutateAsync({ bannerId: deleting.id })
      toast.success('Banner deleted')
      setDeleting(null)
      router.refresh()
    } catch (error) {
      toast.error('Could not delete the banner', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    }
  }

  const isActive = watch('isActive')
  const placement = watch('placement')

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => openEditor('new')}>
          <Plus aria-hidden />
          New banner
        </Button>
      </div>

      {banners.length === 0 ? (
        <EmptyState
          title="No banners yet"
          description="Banners are the promotional strips on the homepage and the announcement bar at the top of the site."
        />
      ) : (
        <DataTable head={['Banner', 'Placement', 'Schedule', 'Status', 'Actions']}>
          {banners.map((banner) => (
            <tr key={banner.id} className="hover:bg-espresso-50">
              <Td>
                <p className="font-medium">{banner.title}</p>
                {banner.subtitle && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {banner.subtitle}
                  </p>
                )}
              </Td>
              <Td>
                <span className="text-xs text-muted-foreground">
                  {humanizeStatus(banner.placement)}
                </span>
              </Td>
              <Td>
                <span className="text-xs text-muted-foreground">
                  {banner.startsAt || banner.endsAt
                    ? `${banner.startsAt ? formatDate(banner.startsAt) : 'Any time'} → ${
                        banner.endsAt ? formatDate(banner.endsAt) : 'No end'
                      }`
                    : 'Always on'}
                </span>
              </Td>
              <Td>
                <StatusBadge
                  status={banner.isActive ? 'ACTIVE' : 'DRAFT'}
                  label={banner.isActive ? 'Live' : 'Hidden'}
                />
              </Td>
              <Td align="right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Edit ${banner.title}`}
                    onClick={() => openEditor(banner)}
                  >
                    <Pencil aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Delete ${banner.title}`}
                    onClick={() => setDeleting(banner)}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </DataTable>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{current ? 'Edit banner' : 'New banner'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label="Title" htmlFor="banner-title" required error={errors.title?.message}>
              <Input id="banner-title" {...register('title')} />
            </Field>

            <Field label="Subtitle" htmlFor="banner-subtitle" error={errors.subtitle?.message}>
              <Input id="banner-subtitle" {...register('subtitle')} />
            </Field>

            <Field
              label="Image URL"
              htmlFor="banner-image"
              hint="Paste a full https:// image address"
              error={errors.imageUrl?.message}
            >
              <Input id="banner-image" {...register('imageUrl')} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Link URL" htmlFor="banner-link" error={errors.linkUrl?.message}>
                <Input id="banner-link" placeholder="/shop" {...register('linkUrl')} />
              </Field>
              <Field label="Button label" htmlFor="banner-cta" error={errors.ctaLabel?.message}>
                <Input id="banner-cta" placeholder="Shop now" {...register('ctaLabel')} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Placement" htmlFor="banner-placement" required>
                <Select
                  value={placement}
                  onValueChange={(value) =>
                    setValue('placement', value as FormValues['placement'], {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger id="banner-placement">
                    <SelectValue placeholder="Choose a placement" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLACEMENTS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Sort order" htmlFor="banner-sort" error={errors.sortOrder?.message}>
                <Input id="banner-sort" type="number" min={0} {...register('sortOrder')} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Starts"
                htmlFor="banner-starts"
                hint="Leave empty to show immediately"
                error={errors.startsAt?.message}
              >
                <Input id="banner-starts" type="date" {...register('startsAt')} />
              </Field>
              <Field
                label="Ends"
                htmlFor="banner-ends"
                hint="Leave empty to run indefinitely"
                error={errors.endsAt?.message}
              >
                <Input id="banner-ends" type="date" {...register('endsAt')} />
              </Field>
            </div>

            <label
              htmlFor="banner-active"
              className="flex cursor-pointer items-center gap-2.5 py-1"
            >
              <Checkbox
                id="banner-active"
                checked={isActive}
                onCheckedChange={(checked) => setValue('isActive', checked === true)}
              />
              <span className="text-sm">Show this banner on the storefront</span>
            </label>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={upsert.isPending}>
                {current ? 'Save changes' : 'Add banner'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this banner?"
        description={`“${deleting?.title ?? ''}” will be removed from the storefront immediately. This can’t be undone.`}
        confirmLabel="Delete banner"
        onConfirm={confirmDelete}
      />
    </>
  )
}
