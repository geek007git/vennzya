'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Send } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { contactSubmissionInput } from '@/modules/support/schema'
import { api } from '@/trpc/react'

type FormValues = z.input<typeof contactSubmissionInput>

export function ContactForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(contactSubmissionInput) })

  const submit = api.support.submit.useMutation()

  async function onSubmit(values: FormValues) {
    try {
      await submit.mutateAsync({
        name: values.name,
        email: values.email,
        ...(values.phone ? { phone: values.phone } : {}),
        ...(values.subject ? { subject: values.subject } : {}),
        message: values.message,
      })

      toast.success('Message sent', {
        description: 'We’ll get back to you within one working day.',
      })
      reset()
    } catch (error) {
      toast.error('We couldn’t send that message', {
        description: error instanceof Error ? error.message : 'Please try again in a moment.',
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" htmlFor="name" required error={errors.name?.message}>
          <Input id="name" autoComplete="name" {...register('name')} />
        </Field>

        <Field label="Email" htmlFor="email" required error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Mobile number"
          htmlFor="phone"
          hint="Optional — helps us reach you faster"
          error={errors.phone?.message}
        >
          <Input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="98765 43210"
            {...register('phone')}
          />
        </Field>

        <Field label="Subject" htmlFor="subject" error={errors.subject?.message}>
          <Input id="subject" placeholder="Order query, sizing help…" {...register('subject')} />
        </Field>
      </div>

      <Field label="Message" htmlFor="message" required error={errors.message?.message}>
        <Textarea
          id="message"
          rows={6}
          placeholder="Tell us how we can help. If it’s about an order, include the order number."
          {...register('message')}
        />
      </Field>

      <Button type="submit" size="lg" loading={isSubmitting}>
        <Send aria-hidden />
        Send message
      </Button>

      <p className="text-xs text-muted-foreground">
        We use your details only to answer this enquiry.
      </p>
    </form>
  )
}
