'use client'

import { useEffect, useState } from 'react'
import { selectItemCount, selectSubtotal, useCartStore } from './store'

/**
 * The persisted cart only exists in the browser. Rendering it during SSR would
 * print an empty cart and then swap after hydration, so these hooks report 0
 * until the component has mounted client-side.
 */
export function useCartHydrated() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  return hydrated
}

export function useCartItemCount() {
  const hydrated = useCartHydrated()
  const count = useCartStore(selectItemCount)
  return hydrated ? count : 0
}

export function useCartSubtotal() {
  const hydrated = useCartHydrated()
  const subtotal = useCartStore(selectSubtotal)
  return hydrated ? subtotal : 0
}

export function useCartLines() {
  const hydrated = useCartHydrated()
  const lines = useCartStore((state) => state.lines)
  return hydrated ? lines : []
}
