'use client'

import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { api } from '@/trpc/react'

export function CouponRowActions({
  couponId,
  code,
  isActive,
  redemptions,
}: {
  couponId: string
  code: string
  isActive: boolean
  redemptions: number
}) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const setActive = api.discounts.setActive.useMutation()
  const remove = api.discounts.remove.useMutation()

  async function toggleActive() {
    try {
      await setActive.mutateAsync({ couponId, isActive: !isActive })
      toast.success(isActive ? `${code} deactivated` : `${code} activated`)
      router.refresh()
    } catch (error) {
      toast.error('Could not update the coupon', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    }
  }

  async function confirmDelete() {
    try {
      await remove.mutateAsync({ couponId })
      toast.success(`${code} deleted`)
      setConfirmOpen(false)
      router.refresh()
    } catch (error) {
      // The router refuses to delete a redeemed coupon and explains why —
      // surface that verbatim rather than a generic failure.
      toast.error('Coupon not deleted', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
      setConfirmOpen(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Button variant="outline" size="sm" onClick={toggleActive} loading={setActive.isPending}>
        {isActive ? 'Deactivate' : 'Activate'}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        aria-label={`Delete ${code}`}
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 aria-hidden />
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {code}?</DialogTitle>
            <DialogDescription>
              {redemptions > 0
                ? `This coupon has been used ${redemptions} time${redemptions === 1 ? '' : 's'}, so it can’t be deleted — the order history references it. Deactivate it instead.`
                : 'This removes the coupon permanently. Shoppers who try the code will be told it isn’t valid.'}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            {redemptions > 0 ? (
              <Button
                onClick={async () => {
                  setConfirmOpen(false)
                  await toggleActive()
                }}
              >
                Deactivate instead
              </Button>
            ) : (
              <Button variant="destructive" onClick={confirmDelete} loading={remove.isPending}>
                Delete coupon
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
