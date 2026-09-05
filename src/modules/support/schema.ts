import { z } from 'zod'
import { isValidIndianMobile } from '@/lib/india'

export const contactSubmissionInput = z.object({
  name: z.string().trim().min(2, 'Please tell us your name').max(80),
  email: z.string().trim().email('Enter a valid email').max(160),
  phone: z
    .string()
    .trim()
    .refine(isValidIndianMobile, 'Enter a valid 10-digit mobile number')
    .or(z.literal(''))
    .optional(),
  subject: z.string().trim().max(120).optional(),
  message: z
    .string()
    .trim()
    .min(10, 'Please give us a little more detail')
    .max(2000, 'Please keep this under 2000 characters'),
})

export type ContactSubmissionInput = z.infer<typeof contactSubmissionInput>

export const CONTACT_STATUSES = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM'] as const

export const contactListInput = z.object({
  status: z.enum(CONTACT_STATUSES).optional(),
  limit: z.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
})

export const contactStatusInput = z.object({
  submissionId: z.string().min(1),
  status: z.enum(CONTACT_STATUSES),
})
