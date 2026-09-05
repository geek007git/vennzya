'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * The cart lives in the browser for everyone, signed in or not — checkout is
 * frictionless by default. Prices held here are for display only; the server
 * re-prices every line from the database before an order is created.
 */

export interface CartLine {
  variantId: string
  productId: string
  slug: string
  name: string
  sku: string
  /** e.g. "Size M · Espresso" */
  variantLabel: string
  unitPrice: number
  imageUrl: string | null
  quantity: number
  maxQuantity: number
}

interface CartState {
  lines: CartLine[]
  isOpen: boolean
  addLine: (line: Omit<CartLine, 'quantity'>, quantity?: number) => void
  removeLine: (variantId: string) => void
  setQuantity: (variantId: string, quantity: number) => void
  clear: () => void
  openCart: () => void
  closeCart: () => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      isOpen: false,

      addLine: (line, quantity = 1) =>
        set((state) => {
          const existing = state.lines.find((l) => l.variantId === line.variantId)

          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.variantId === line.variantId
                  ? { ...l, ...line, quantity: Math.min(l.quantity + quantity, line.maxQuantity) }
                  : l,
              ),
              isOpen: true,
            }
          }

          return {
            lines: [...state.lines, { ...line, quantity: Math.min(quantity, line.maxQuantity) }],
            isOpen: true,
          }
        }),

      removeLine: (variantId) =>
        set((state) => ({ lines: state.lines.filter((l) => l.variantId !== variantId) })),

      setQuantity: (variantId, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.variantId !== variantId)
              : state.lines.map((l) =>
                  l.variantId === variantId
                    ? { ...l, quantity: Math.min(quantity, l.maxQuantity) }
                    : l,
                ),
        })),

      clear: () => set({ lines: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
    }),
    {
      name: 'vennzya-cart',
      version: 1,
      partialize: (state) => ({ lines: state.lines }),
    },
  ),
)

export const selectItemCount = (state: CartState) =>
  state.lines.reduce((sum, l) => sum + l.quantity, 0)

export const selectSubtotal = (state: CartState) =>
  state.lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0)
