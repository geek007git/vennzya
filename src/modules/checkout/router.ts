import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { verifyPaymentSignature } from '@/modules/payments/razorpay'
import { confirmPayment } from '@/modules/payments/service'
import { publicProcedure, router } from '@/server/trpc/init'
import { rateLimiters } from '@/server/rate-limit'
import { placeOrderInput, quoteInput, verifyPaymentInput } from './schema'
import { checkoutService } from './service'

export const checkoutRouter = router({
  quote: publicProcedure.input(quoteInput).query(({ input, ctx }) =>
    checkoutService.quote(input.items, {
      couponCode: input.couponCode,
      state: input.state,
      userId: ctx.user?.id ?? null,
    }),
  ),

  applyCoupon: publicProcedure
    .input(quoteInput.extend({ couponCode: z.string().trim().min(1).max(40) }))
    .mutation(async ({ input, ctx }) => {
      const limit = await rateLimiters.couponValidate(ctx.ip)
      if (!limit.success) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many coupon attempts. Please try again shortly.',
        })
      }

      return checkoutService.quote(input.items, {
        couponCode: input.couponCode,
        state: input.state,
        userId: ctx.user?.id ?? null,
      })
    }),

  placeOrder: publicProcedure.input(placeOrderInput).mutation(async ({ input, ctx }) => {
    const limit = await rateLimiters.checkout(ctx.ip)
    if (!limit.success) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many checkout attempts. Please wait a moment and try again.',
      })
    }

    return checkoutService.placeOrder(input, ctx.user?.id ?? null)
  }),

  /**
   * The browser reports back after Razorpay Checkout closes. This is the fast
   * path for a good user experience; the webhook remains authoritative.
   */
  verifyPayment: publicProcedure.input(verifyPaymentInput).mutation(async ({ input }) => {
    const signatureValid = verifyPaymentSignature({
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      signature: input.razorpaySignature,
    })

    if (!signatureValid) {
      logger.error({ razorpayOrderId: input.razorpayOrderId }, 'payment verify: bad signature')
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'We could not verify that payment. If money was deducted, contact us and we will resolve it.',
      })
    }

    const result = await confirmPayment({
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      signature: input.razorpaySignature,
    })

    if (result.outcome === 'not-found') {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'We could not find that order.' })
    }

    return { orderId: result.orderId, orderNumber: result.orderNumber }
  }),
})
