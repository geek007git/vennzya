'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { signIn } from '@/lib/auth-client'

const schema = z.object({
  email: z.string().trim().email('Enter your work email'),
  password: z.string().min(1, 'Enter your password'),
})

type FormValues = z.infer<typeof schema>

export function AdminLoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setFormError(null)
    setIsSubmitting(true)

    const result = await signIn.email({ email: values.email, password: values.password })

    if (result.error) {
      // Deliberately vague: never reveal whether the address exists.
      setFormError('Those details didn’t match. Please try again.')
      setIsSubmitting(false)
      return
    }

    router.replace(params.get('next') ?? '/admin')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
      <Field label="Email" htmlFor="email" required error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" autoFocus {...register('email')} />
      </Field>

      <Field label="Password" htmlFor="password" required error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
        />
      </Field>

      {formError && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {formError}
        </p>
      )}

      <Button type="submit" block loading={isSubmitting}>
        Sign in
      </Button>
    </form>
  )
}
