'use client'

import { AlertTriangle, Eye, Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'
import { EmptyState } from '@/components/admin/kit'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { api } from '@/trpc/react'

/** The keys `content.updatePage` accepts. */
const EDITABLE_KEYS = ['privacy', 'terms', 'shipping', 'returns', 'about'] as const
type EditableKey = (typeof EDITABLE_KEYS)[number]

export interface PolicyPage {
  pageKey: string
  title: string
  bodyMarkdown: string
  seoTitle: string | null
  seoDescription: string | null
  updatedAt: Date
}

function isEditableKey(value: string): value is EditableKey {
  return (EDITABLE_KEYS as readonly string[]).includes(value)
}

/** Matches the storefront's markdown styling so the preview is truthful. */
const PROSE = [
  'text-sm leading-relaxed text-muted-foreground',
  '[&>*+*]:mt-4',
  '[&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground',
  '[&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground',
  '[&_strong]:font-semibold [&_strong]:text-foreground',
  '[&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5',
  '[&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5',
  '[&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4',
  '[&_table]:w-full [&_table]:border-collapse [&_table]:text-left',
  '[&_th]:border-b [&_th]:border-border [&_th]:py-2 [&_th]:pr-4 [&_th]:font-semibold [&_th]:text-foreground',
  '[&_td]:border-b [&_td]:border-border [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top',
  '[&_hr]:my-6 [&_hr]:border-border',
].join(' ')

function PageEditor({ page }: { page: PolicyPage }) {
  const router = useRouter()
  const [title, setTitle] = useState(page.title)
  const [body, setBody] = useState(page.bodyMarkdown)
  const [seoTitle, setSeoTitle] = useState(page.seoTitle ?? '')
  const [seoDescription, setSeoDescription] = useState(page.seoDescription ?? '')
  const [showPreview, setShowPreview] = useState(false)

  const update = api.content.updatePage.useMutation()

  const editable = isEditableKey(page.pageKey)
  const isDirty =
    title !== page.title ||
    body !== page.bodyMarkdown ||
    seoTitle !== (page.seoTitle ?? '') ||
    seoDescription !== (page.seoDescription ?? '')

  async function save() {
    if (!editable) return

    try {
      await update.mutateAsync({
        pageKey: page.pageKey as EditableKey,
        title,
        bodyMarkdown: body,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
      })
      toast.success(`${title} saved`, { description: 'The page is live on the storefront now.' })
      router.refresh()
    } catch (error) {
      toast.error('Could not save the page', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    }
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-border">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-medium">{page.title}</p>
          <p className="text-xs text-muted-foreground">
            /policies/{page.pageKey} · updated {formatDate(page.updatedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPreview((value) => !value)}
          >
            {showPreview ? <Pencil aria-hidden /> : <Eye aria-hidden />}
            {showPreview ? 'Edit' : 'Preview'}
          </Button>
          <Button size="sm" onClick={save} loading={update.isPending} disabled={!isDirty}>
            Save
          </Button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {!editable && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            This page can’t be edited here yet.
          </p>
        )}

        <Field label="Page title" htmlFor={`page-title-${page.pageKey}`} required>
          <Input
            id={`page-title-${page.pageKey}`}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={!editable}
          />
        </Field>

        {showPreview ? (
          <div className="rounded-md border border-border bg-cream-50 p-4">
            <div className={PROSE}>
              <Markdown remarkPlugins={[remarkGfm]}>{body}</Markdown>
            </div>
          </div>
        ) : (
          <Field
            label="Page content"
            htmlFor={`page-body-${page.pageKey}`}
            required
            hint="Markdown: ## for headings, - for bullets, **bold**"
          >
            <Textarea
              id={`page-body-${page.pageKey}`}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={16}
              disabled={!editable}
              className="font-mono text-xs"
            />
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Search engine title"
            htmlFor={`page-seo-title-${page.pageKey}`}
            hint="Optional, up to 70 characters"
          >
            <Input
              id={`page-seo-title-${page.pageKey}`}
              value={seoTitle}
              maxLength={70}
              onChange={(event) => setSeoTitle(event.target.value)}
              disabled={!editable}
            />
          </Field>
          <Field
            label="Search engine description"
            htmlFor={`page-seo-description-${page.pageKey}`}
            hint="Optional, up to 180 characters"
          >
            <Input
              id={`page-seo-description-${page.pageKey}`}
              value={seoDescription}
              maxLength={180}
              onChange={(event) => setSeoDescription(event.target.value)}
              disabled={!editable}
            />
          </Field>
        </div>
      </div>
    </div>
  )
}

export function PolicyPagesSection({ pages }: { pages: PolicyPage[] }) {
  if (pages.length === 0) {
    return (
      <EmptyState
        title="No policy pages found"
        description="Run the database seed to create the privacy, terms, shipping and returns pages."
      />
    )
  }

  return (
    <div className="space-y-5">
      <div
        className={cn(
          'flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3',
        )}
      >
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
        <p className="text-xs leading-relaxed text-foreground">
          <strong className="font-semibold">These pages currently hold placeholder text.</strong> It
          was written to give the site a sensible shape, not as legal advice. Have the business
          owner or a legal professional review and approve every one of these before the store takes
          real orders.
        </p>
      </div>

      {pages.map((page) => (
        <PageEditor key={page.pageKey} page={page} />
      ))}
    </div>
  )
}
