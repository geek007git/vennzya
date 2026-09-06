'use client'

import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { DynamicButton } from '@/components/ui/dynamic-button'

/** How long the button stays in its copied state. */
const COPIED_MS = 1600

/**
 * Shoppers quote the order number back to us on WhatsApp, so make it one tap
 * to carry rather than something to squint at and retype.
 */
export function CopyOrderNumber({ orderNumber }: { orderNumber: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    },
    [],
  )

  async function copy() {
    try {
      await navigator.clipboard.writeText(orderNumber)
    } catch {
      // Clipboard access is refused on insecure origins and in some in-app
      // browsers; the number is on screen either way.
      toast.error('Could not copy — please select the number instead')
      return
    }

    setCopied(true)
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), COPIED_MS)
  }

  return (
    <DynamicButton
      icon={copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      onClick={copy}
      size="sm"
      stateKey={copied ? 'copied' : 'copy'}
      variant="ghost"
    >
      {copied ? 'Copied' : 'Copy order number'}
    </DynamicButton>
  )
}
