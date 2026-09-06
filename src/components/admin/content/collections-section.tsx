'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
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
import { slugify } from '@/lib/utils'
import { api } from '@/trpc/react'
import { ConfirmDialog } from './confirm-dialog'

export interface CollectionRow {
  id: string
  title: string
  slug: string
  description: string | null
  imageUrl: string | null
  isActive: boolean
  sortOrder: number
  products: { productId: string; product: { name: string } }[]
}

type Collection = CollectionRow

interface PickedProduct {
  id: string
  name: string
}

const formSchema = z.object({
  title: z.string().trim().min(2, 'Give the collection a title').max(120),
  slug: z
    .string()
    .trim()
    .min(2, 'A web address is required')
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, digits and dashes only'),
  description: z.string().trim().max(600),
  imageUrl: z.string().trim().url('Enter a full image URL').or(z.literal('')),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int().min(0),
})

type FormValues = z.input<typeof formSchema>

function ProductPicker({
  picked,
  onChange,
}: {
  picked: PickedProduct[]
  onChange: (next: PickedProduct[]) => void
}) {
  const [term, setTerm] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), 300)
    return () => clearTimeout(timer)
  }, [term])

  const results = api.catalogAdmin.products.useQuery(
    { ...(debounced ? { q: debounced } : {}), limit: 20, lowStockOnly: false },
    { retry: false },
  )

  function toggle(product: PickedProduct) {
    const exists = picked.some((item) => item.id === product.id)
    onChange(exists ? picked.filter((item) => item.id !== product.id) : [...picked, product])
  }

  return (
    <div className="space-y-3">
      {picked.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {picked.map((product) => (
            <span
              key={product.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-espresso-50 py-1 pl-3 pr-1 text-xs"
            >
              {product.name}
              <button
                type="button"
                aria-label={`Remove ${product.name}`}
                onClick={() => onChange(picked.filter((item) => item.id !== product.id))}
                className="inline-flex size-6 items-center justify-center rounded-full hover:bg-espresso-200"
              >
                <X className="size-3" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search products to add"
          aria-label="Search products"
          className="pl-9"
        />
      </div>

      {results.isError ? (
        <p className="rounded-md bg-espresso-50 px-3 py-2 text-xs text-muted-foreground">
          You need the products permission to browse the catalogue. The products already in this
          collection are kept as they are.
        </p>
      ) : (
        <div className="max-h-48 overflow-y-auto rounded-md border border-border">
          {results.isLoading && (
            <p className="px-3 py-3 text-xs text-muted-foreground">Searching…</p>
          )}
          {results.data?.items.length === 0 && (
            <p className="px-3 py-3 text-xs text-muted-foreground">
              No products match that search.
            </p>
          )}
          {results.data?.items.map((product) => {
            const isPicked = picked.some((item) => item.id === product.id)
            return (
              <label
                key={product.id}
                htmlFor={`collection-product-${product.id}`}
                className="flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0 hover:bg-espresso-50"
              >
                <Checkbox
                  id={`collection-product-${product.id}`}
                  checked={isPicked}
                  onCheckedChange={() => toggle({ id: product.id, name: product.name })}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{product.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {product.categoryName ?? 'Uncategorised'}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function CollectionsSection({ collections }: { collections: Collection[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<Collection | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Collection | null>(null)
  const [picked, setPicked] = useState<PickedProduct[]>([])
  const [slugTouched, setSlugTouched] = useState(false)

  const upsert = api.contentAdmin.upsertCollection.useMutation()
  const remove = api.contentAdmin.deleteCollection.useMutation()

  const current = editing === 'new' ? null : editing

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) })

  const title = watch('title')

  // Mirror the title into the slug until the owner edits the slug themselves.
  useEffect(() => {
    if (!slugTouched && editing === 'new' && title) {
      setValue('slug', slugify(title))
    }
  }, [title, slugTouched, editing, setValue])

  function openEditor(collection: Collection | 'new') {
    const source = collection === 'new' ? null : collection
    reset({
      title: source?.title ?? '',
      slug: source?.slug ?? '',
      description: source?.description ?? '',
      imageUrl: source?.imageUrl ?? '',
      isActive: source?.isActive ?? true,
      sortOrder: source?.sortOrder ?? 0,
    })
    setPicked(source?.products.map((row) => ({ id: row.productId, name: row.product.name })) ?? [])
    setSlugTouched(collection !== 'new')
    setEditing(collection)
  }

  async function onSubmit(values: FormValues) {
    const parsed = formSchema.parse(values)

    try {
      await upsert.mutateAsync({
        ...(current ? { id: current.id } : {}),
        title: parsed.title,
        slug: parsed.slug,
        description: parsed.description || null,
        imageUrl: parsed.imageUrl || null,
        isActive: parsed.isActive,
        sortOrder: parsed.sortOrder,
        productIds: picked.map((product) => product.id),
      })
      toast.success(current ? 'Collection updated' : 'Collection created')
      setEditing(null)
      router.refresh()
    } catch (error) {
      toast.error('Could not save the collection', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await remove.mutateAsync({ collectionId: deleting.id })
      toast.success('Collection deleted')
      setDeleting(null)
      router.refresh()
    } catch (error) {
      toast.error('Could not delete the collection', {
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
          New collection
        </Button>
      </div>

      {collections.length === 0 ? (
        <EmptyState
          title="No collections yet"
          description="Collections group products for a season or a theme — “Festive Edit”, “New Arrivals”."
        />
      ) : (
        <DataTable head={['Collection', 'Web address', 'Products', 'Status', 'Actions']}>
          {collections.map((collection) => (
            <tr key={collection.id} className="hover:bg-espresso-50">
              <Td>
                <p className="font-medium">{collection.title}</p>
                {collection.description && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {collection.description}
                  </p>
                )}
              </Td>
              <Td>
                <span className="text-xs text-muted-foreground">/{collection.slug}</span>
              </Td>
              <Td>
                <span className="text-xs text-muted-foreground">
                  {collection.products.length}{' '}
                  {collection.products.length === 1 ? 'product' : 'products'}
                </span>
              </Td>
              <Td>
                <StatusBadge
                  status={collection.isActive ? 'ACTIVE' : 'DRAFT'}
                  label={collection.isActive ? 'Live' : 'Hidden'}
                />
              </Td>
              <Td align="right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Edit ${collection.title}`}
                    onClick={() => openEditor(collection)}
                  >
                    <Pencil aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Delete ${collection.title}`}
                    onClick={() => setDeleting(collection)}
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
            <DialogTitle>{current ? 'Edit collection' : 'New collection'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label="Title" htmlFor="collection-title" required error={errors.title?.message}>
              <Input id="collection-title" {...register('title')} />
            </Field>

            <Field
              label="Web address"
              htmlFor="collection-slug"
              required
              hint="Appears as /shop?collection=…"
              error={errors.slug?.message}
            >
              <Input
                id="collection-slug"
                {...register('slug', { onChange: () => setSlugTouched(true) })}
              />
            </Field>

            <Field
              label="Description"
              htmlFor="collection-description"
              error={errors.description?.message}
            >
              <Textarea id="collection-description" rows={3} {...register('description')} />
            </Field>

            <Field
              label="Image URL"
              htmlFor="collection-image"
              hint="Paste a full https:// image address"
              error={errors.imageUrl?.message}
            >
              <Input id="collection-image" {...register('imageUrl')} />
            </Field>

            <div>
              <p className="mb-2 text-sm font-medium">Products in this collection</p>
              <ProductPicker picked={picked} onChange={setPicked} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Sort order" htmlFor="collection-sort" error={errors.sortOrder?.message}>
                <Input id="collection-sort" type="number" min={0} {...register('sortOrder')} />
              </Field>
            </div>

            <label
              htmlFor="collection-active"
              className="flex cursor-pointer items-center gap-2.5 py-1"
            >
              <Checkbox
                id="collection-active"
                checked={isActive}
                onCheckedChange={(checked) => setValue('isActive', checked === true)}
              />
              <span className="text-sm">Show this collection on the storefront</span>
            </label>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={upsert.isPending}>
                {current ? 'Save changes' : 'Create collection'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this collection?"
        description={`“${deleting?.title ?? ''}” will be removed. The products in it are not deleted.`}
        confirmLabel="Delete collection"
        onConfirm={confirmDelete}
      />
    </>
  )
}
