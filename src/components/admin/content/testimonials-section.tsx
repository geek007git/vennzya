'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { DataTable, EmptyState, StatusBadge, Td } from '@/components/admin/kit'
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
import { Input, Textarea } from '@/components/ui/input'
import { Badge } from '@/components/ui/primitives'
import { api } from '@/trpc/react'
import { ConfirmDialog } from './confirm-dialog'

export interface TestimonialRow {
  id: string
  authorName: string
  location: string | null
  body: string
  rating: number | null
  isApproved: boolean
  isFeatured: boolean
  sortOrder: number
}

type Testimonial = TestimonialRow

const formSchema = z.object({
  authorName: z.string().trim().min(2, 'Who said this?').max(80),
  location: z.string().trim().max(80),
  body: z.string().trim().min(10, 'A little more detail, please').max(1000),
  rating: z.coerce.number().int().min(0).max(5),
  isApproved: z.boolean(),
  isFeatured: z.boolean(),
  sortOrder: z.coerce.number().int().min(0),
})

type FormValues = z.input<typeof formSchema>

export function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<Testimonial | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Testimonial | null>(null)

  const upsert = api.contentAdmin.upsertTestimonial.useMutation()
  const remove = api.contentAdmin.deleteTestimonial.useMutation()

  const current = editing === 'new' ? null : editing

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) })

  function openEditor(testimonial: Testimonial | 'new') {
    const source = testimonial === 'new' ? null : testimonial
    reset({
      authorName: source?.authorName ?? '',
      location: source?.location ?? '',
      body: source?.body ?? '',
      rating: source?.rating ?? 5,
      isApproved: source?.isApproved ?? true,
      isFeatured: source?.isFeatured ?? false,
      sortOrder: source?.sortOrder ?? 0,
    })
    setEditing(testimonial)
  }

  async function onSubmit(values: FormValues) {
    const parsed = formSchema.parse(values)

    try {
      await upsert.mutateAsync({
        ...(current ? { id: current.id } : {}),
        authorName: parsed.authorName,
        location: parsed.location || null,
        body: parsed.body,
        rating: parsed.rating === 0 ? null : parsed.rating,
        isApproved: parsed.isApproved,
        isFeatured: parsed.isFeatured,
        sortOrder: parsed.sortOrder,
      })
      toast.success(current ? 'Review updated' : 'Review added')
      setEditing(null)
      router.refresh()
    } catch (error) {
      toast.error('Could not save the review', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await remove.mutateAsync({ testimonialId: deleting.id })
      toast.success('Review deleted')
      setDeleting(null)
      router.refresh()
    } catch (error) {
      toast.error('Could not delete the review', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    }
  }

  const isApproved = watch('isApproved')
  const isFeatured = watch('isFeatured')

  return (
    <>
      <p className="mb-4 rounded-md bg-espresso-50 px-3 py-2 text-xs text-muted-foreground">
        Only <strong className="text-foreground">approved</strong> reviews appear on the storefront.
        Featured ones also show on the homepage.
      </p>

      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => openEditor('new')}>
          <Plus aria-hidden />
          New review
        </Button>
      </div>

      {testimonials.length === 0 ? (
        <EmptyState
          title="No reviews yet"
          description="Add reviews customers have sent you. Nothing is published until you approve it."
        />
      ) : (
        <DataTable head={['Customer', 'Review', 'Rating', 'Visibility', 'Actions']}>
          {testimonials.map((testimonial) => (
            <tr key={testimonial.id} className="hover:bg-espresso-50">
              <Td>
                <p className="font-medium">{testimonial.authorName}</p>
                {testimonial.location && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{testimonial.location}</p>
                )}
              </Td>
              <Td className="max-w-sm">
                <p className="line-clamp-2 text-xs text-muted-foreground">{testimonial.body}</p>
              </Td>
              <Td>
                {testimonial.rating ? (
                  <span className="inline-flex items-center gap-1 text-xs">
                    <Star className="size-3.5 fill-espresso-500 text-espresso-500" aria-hidden />
                    {testimonial.rating}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1.5">
                  <StatusBadge
                    status={testimonial.isApproved ? 'ACTIVE' : 'DRAFT'}
                    label={testimonial.isApproved ? 'Published' : 'Hidden'}
                  />
                  {testimonial.isFeatured && <Badge variant="outline">Homepage</Badge>}
                </div>
              </Td>
              <Td align="right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Edit review from ${testimonial.authorName}`}
                    onClick={() => openEditor(testimonial)}
                  >
                    <Pencil aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Delete review from ${testimonial.authorName}`}
                    onClick={() => setDeleting(testimonial)}
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
            <DialogTitle>{current ? 'Edit review' : 'New review'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Customer name"
                htmlFor="testimonial-author"
                required
                error={errors.authorName?.message}
              >
                <Input id="testimonial-author" {...register('authorName')} />
              </Field>
              <Field label="City" htmlFor="testimonial-location" error={errors.location?.message}>
                <Input id="testimonial-location" placeholder="Chennai" {...register('location')} />
              </Field>
            </div>

            <Field label="Review" htmlFor="testimonial-body" required error={errors.body?.message}>
              <Textarea id="testimonial-body" rows={4} {...register('body')} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Rating"
                htmlFor="testimonial-rating"
                hint="0 leaves the stars off"
                error={errors.rating?.message}
              >
                <Input
                  id="testimonial-rating"
                  type="number"
                  min={0}
                  max={5}
                  {...register('rating')}
                />
              </Field>
              <Field
                label="Sort order"
                htmlFor="testimonial-sort"
                error={errors.sortOrder?.message}
              >
                <Input id="testimonial-sort" type="number" min={0} {...register('sortOrder')} />
              </Field>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="testimonial-approved"
                className="flex cursor-pointer items-center gap-2.5 py-1"
              >
                <Checkbox
                  id="testimonial-approved"
                  checked={isApproved}
                  onCheckedChange={(checked) => setValue('isApproved', checked === true)}
                />
                <span className="text-sm">Publish this review on the storefront</span>
              </label>
              <label
                htmlFor="testimonial-featured"
                className="flex cursor-pointer items-center gap-2.5 py-1"
              >
                <Checkbox
                  id="testimonial-featured"
                  checked={isFeatured}
                  onCheckedChange={(checked) => setValue('isFeatured', checked === true)}
                />
                <span className="text-sm">Also feature it on the homepage</span>
              </label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={upsert.isPending}>
                {current ? 'Save changes' : 'Add review'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this review?"
        description={`The review from ${deleting?.authorName ?? ''} will be removed permanently.`}
        confirmLabel="Delete review"
        onConfirm={confirmDelete}
      />
    </>
  )
}
