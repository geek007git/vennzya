'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus, Trash2 } from 'lucide-react'
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
import { api } from '@/trpc/react'
import { ConfirmDialog } from './confirm-dialog'

export interface FaqRow {
  id: string
  question: string
  answer: string
  category: string | null
  sortOrder: number
  isActive: boolean
}

type FaqItem = FaqRow

const formSchema = z.object({
  question: z.string().trim().min(5, 'What is the question?').max(200),
  answer: z.string().trim().min(5, 'Give the customer a real answer').max(2000),
  category: z.string().trim().max(60),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
})

type FormValues = z.input<typeof formSchema>

export function FaqSection({ items }: { items: FaqItem[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<FaqItem | 'new' | null>(null)
  const [deleting, setDeleting] = useState<FaqItem | null>(null)

  const upsert = api.contentAdmin.upsertFaq.useMutation()
  const remove = api.contentAdmin.deleteFaq.useMutation()

  const current = editing === 'new' ? null : editing

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) })

  function openEditor(item: FaqItem | 'new') {
    const source = item === 'new' ? null : item
    reset({
      question: source?.question ?? '',
      answer: source?.answer ?? '',
      category: source?.category ?? '',
      sortOrder: source?.sortOrder ?? 0,
      isActive: source?.isActive ?? true,
    })
    setEditing(item)
  }

  async function onSubmit(values: FormValues) {
    const parsed = formSchema.parse(values)

    try {
      await upsert.mutateAsync({
        ...(current ? { id: current.id } : {}),
        question: parsed.question,
        answer: parsed.answer,
        category: parsed.category || null,
        sortOrder: parsed.sortOrder,
        isActive: parsed.isActive,
      })
      toast.success(current ? 'Question updated' : 'Question added')
      setEditing(null)
      router.refresh()
    } catch (error) {
      toast.error('Could not save the question', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await remove.mutateAsync({ faqId: deleting.id })
      toast.success('Question deleted')
      setDeleting(null)
      router.refresh()
    } catch (error) {
      toast.error('Could not delete the question', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    }
  }

  const isActive = watch('isActive')

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => openEditor('new')}>
          <Plus aria-hidden />
          New question
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No questions yet"
          description="Answer the things customers ask most — sizing, delivery times, returns."
        />
      ) : (
        <DataTable head={['Question', 'Category', 'Order', 'Status', 'Actions']}>
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-espresso-50">
              <Td className="max-w-md">
                <p className="font-medium">{item.question}</p>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{item.answer}</p>
              </Td>
              <Td>
                <span className="text-xs text-muted-foreground">{item.category ?? '—'}</span>
              </Td>
              <Td>
                <span className="text-xs text-muted-foreground">{item.sortOrder}</span>
              </Td>
              <Td>
                <StatusBadge
                  status={item.isActive ? 'ACTIVE' : 'DRAFT'}
                  label={item.isActive ? 'Live' : 'Hidden'}
                />
              </Td>
              <Td align="right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Edit question: ${item.question}`}
                    onClick={() => openEditor(item)}
                  >
                    <Pencil aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Delete question: ${item.question}`}
                    onClick={() => setDeleting(item)}
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
            <DialogTitle>{current ? 'Edit question' : 'New question'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field
              label="Question"
              htmlFor="faq-question"
              required
              error={errors.question?.message}
            >
              <Input id="faq-question" {...register('question')} />
            </Field>

            <Field label="Answer" htmlFor="faq-answer" required error={errors.answer?.message}>
              <Textarea id="faq-answer" rows={5} {...register('answer')} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Category"
                htmlFor="faq-category"
                hint="Optional grouping, e.g. Delivery"
                error={errors.category?.message}
              >
                <Input id="faq-category" {...register('category')} />
              </Field>
              <Field label="Sort order" htmlFor="faq-sort" error={errors.sortOrder?.message}>
                <Input id="faq-sort" type="number" min={0} {...register('sortOrder')} />
              </Field>
            </div>

            <label htmlFor="faq-active" className="flex cursor-pointer items-center gap-2.5 py-1">
              <Checkbox
                id="faq-active"
                checked={isActive}
                onCheckedChange={(checked) => setValue('isActive', checked === true)}
              />
              <span className="text-sm">Show this question on the FAQ page</span>
            </label>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={upsert.isPending}>
                {current ? 'Save changes' : 'Add question'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this question?"
        description={`“${deleting?.question ?? ''}” will be removed from the FAQ page permanently.`}
        confirmLabel="Delete question"
        onConfirm={confirmDelete}
      />
    </>
  )
}
