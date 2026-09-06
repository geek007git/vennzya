'use client'

import { Minus, Plus } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { api } from '@/trpc/react'

export function LowStockToggle() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const lowOnly = params.get('low') === '1'

  return (
    <label
      htmlFor="stock-low-only"
      className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm"
    >
      <Checkbox
        id="stock-low-only"
        checked={lowOnly}
        onCheckedChange={(checked) =>
          router.push(checked === true ? `${pathname}?low=1` : pathname)
        }
      />
      Low stock only
    </label>
  )
}

/**
 * Direction is chosen with a button, never typed as a signed number — a bare
 * "-2" in a box is far too easy to fat-finger into a stock write-off.
 */
export function StockAdjuster({
  variantId,
  sku,
  productName,
  variantLabel,
  stockQuantity,
}: {
  variantId: string
  sku: string
  productName: string
  variantLabel: string
  stockQuantity: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [direction, setDirection] = useState<'add' | 'remove'>('add')
  const [amount, setAmount] = useState('1')
  const [note, setNote] = useState('')

  const adjust = api.catalogAdmin.adjustStock.useMutation({
    onSuccess: (result) => {
      toast.success(`${sku} is now ${result.stockQuantity} in stock`)
      setOpen(false)
      setAmount('1')
      setNote('')
      router.refresh()
    },
    onError: (error) => toast.error('Could not adjust stock', { description: error.message }),
  })

  const quantity = Number(amount)
  const isValid = Number.isInteger(quantity) && quantity > 0
  const delta = direction === 'add' ? quantity : -quantity
  const resulting = stockQuantity + (isValid ? delta : 0)
  const wouldGoNegative = isValid && resulting < 0

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Adjust
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust stock</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 p-5 pt-0">
            <div className="rounded-md bg-espresso-50 px-3 py-2">
              <p className="text-sm font-medium">{productName}</p>
              <p className="text-xs text-muted-foreground">
                {variantLabel || sku} · {stockQuantity} in stock
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant={direction === 'add' ? 'primary' : 'outline'}
                className="flex-1"
                onClick={() => setDirection('add')}
              >
                <Plus aria-hidden />
                Restock
              </Button>
              <Button
                type="button"
                variant={direction === 'remove' ? 'primary' : 'outline'}
                className="flex-1"
                onClick={() => setDirection('remove')}
              >
                <Minus aria-hidden />
                Remove
              </Button>
            </div>

            <Field label="How many" htmlFor="stock-amount" required>
              <Input
                id="stock-amount"
                type="number"
                inputMode="numeric"
                min={1}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </Field>

            <Field label="Note" htmlFor="stock-note" hint="Optional — why the count changed">
              <Input
                id="stock-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="New delivery from supplier"
              />
            </Field>

            <p
              className={`rounded-md px-3 py-2 text-sm ${
                wouldGoNegative
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-espresso-50 text-foreground'
              }`}
            >
              {isValid ? (
                wouldGoNegative ? (
                  `That would take ${sku} below zero.`
                ) : (
                  <>
                    <strong>
                      {direction === 'add' ? '+' : '−'}
                      {quantity}
                    </strong>{' '}
                    → {resulting} in stock
                  </>
                )
              ) : (
                'Enter a whole number above zero.'
              )}
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!isValid || wouldGoNegative}
                loading={adjust.isPending}
                onClick={() =>
                  adjust.mutate({
                    variantId,
                    quantityDelta: delta,
                    ...(note.trim() ? { note: note.trim() } : {}),
                  })
                }
              >
                {direction === 'add' ? `Add ${quantity || ''}` : `Remove ${quantity || ''}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
