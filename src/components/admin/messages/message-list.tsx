'use client'

import { ChevronDown, Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { EmptyState, StatusBadge } from '@/components/admin/kit'
import { WhatsAppIcon } from '@/components/ui/brand-icons'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDateTime } from '@/lib/format'
import { formatPhone } from '@/lib/india'
import { siteConfig } from '@/lib/site-config'
import { cn } from '@/lib/utils'
import { api } from '@/trpc/react'

type ContactStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'SPAM'

export interface SubmissionRow {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string | null
  message: string
  status: ContactStatus
  createdAt: Date
  respondedAt: Date | null
  respondedBy: { name: string | null; email: string | null } | null
}

type Submission = SubmissionRow

const STATUS_OPTIONS: { value: ContactStatus; label: string }[] = [
  { value: 'NEW', label: 'New' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'SPAM', label: 'Spam' },
]

/** wa.me needs the CUSTOMER's number here, not the shop's. */
function customerWhatsAppLink(phone: string, name: string): string {
  const message = `Hi ${name}, this is ${siteConfig.shortName} replying to your enquiry.`
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

function MessageRow({ submission }: { submission: Submission }) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const updateStatus = api.support.updateStatus.useMutation()

  async function changeStatus(status: ContactStatus) {
    try {
      await updateStatus.mutateAsync({ submissionId: submission.id, status })
      toast.success(`Marked as ${status.replace('_', ' ').toLowerCase()}`)
      router.refresh()
    } catch (error) {
      toast.error('Could not update the message', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    }
  }

  return (
    <li className="border-b border-border last:border-b-0">
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <ChevronDown
            className={cn(
              'mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-200',
              expanded && 'rotate-180',
            )}
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{submission.name}</span>
              <StatusBadge status={submission.status} />
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {submission.subject || 'No subject'} · {formatDateTime(submission.createdAt)}
            </span>
            {!expanded && (
              <span className="mt-1 block line-clamp-1 text-xs text-muted-foreground">
                {submission.message}
              </span>
            )}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <Select value={submission.status} onValueChange={changeStatus}>
            <SelectTrigger
              className="h-11 w-[9.5rem]"
              aria-label={`Status for message from ${submission.name}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {submission.phone ? (
            <Button asChild variant="whatsapp" size="sm">
              <a
                href={customerWhatsAppLink(submission.phone, submission.name)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon className="size-4" />
                Reply
              </a>
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm">
              <a
                href={`mailto:${submission.email}?subject=Re: ${submission.subject ?? 'Your enquiry'}`}
              >
                <Mail aria-hidden />
                Reply
              </a>
            </Button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border bg-espresso-50 px-4 py-4 sm:pl-11">
          <p className="whitespace-pre-line text-sm leading-relaxed">{submission.message}</p>

          <dl className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
            <div>
              <dt className="font-medium text-foreground">Email</dt>
              <dd>
                <a href={`mailto:${submission.email}`} className="underline underline-offset-4">
                  {submission.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Phone</dt>
              <dd>{submission.phone ? formatPhone(submission.phone) : 'Not given'}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Handled by</dt>
              <dd>
                {submission.respondedBy
                  ? `${submission.respondedBy.name ?? submission.respondedBy.email ?? 'Staff'}${
                      submission.respondedAt ? ` · ${formatDateTime(submission.respondedAt)}` : ''
                    }`
                  : 'Nobody yet'}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </li>
  )
}

export function MessageList({ submissions }: { submissions: Submission[] }) {
  if (submissions.length === 0) {
    return (
      <EmptyState
        title="No messages here"
        description="Enquiries sent through the contact form land in this inbox."
      />
    )
  }

  return (
    <ul className="rounded-[var(--radius-card)] border border-border bg-card">
      {submissions.map((submission) => (
        <MessageRow key={submission.id} submission={submission} />
      ))}
    </ul>
  )
}
