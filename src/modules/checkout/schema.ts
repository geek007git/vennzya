import { z } from 'zod'
import { INDIAN_STATES, isValidIndianMobile, PINCODE_REGEX } from '@/lib/india'

export const addressInput = z.object({
  fullName: z.string().trim().min(2, 'Please enter the full name').max(80),
  phone: z
    .string()
    .trim()
    .refine(isValidIndianMobile, 'Enter a valid 10-digit mobile number'),
  line1: z.string().trim().min(4, 'Please enter the address').max(160),
  line2: z.string().trim().max(160).optional(),
  landmark: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2, 'Please enter the city').max(80),
  state: z.enum(INDIAN_STATES, { message: 'Please select a state' }),
  postalCode: z.string().trim().regex(PINCODE_REGEX, 'Enter a valid 6-digit PIN code'),
  country: z.literal('IN').default('IN'),
})

export type AddressInput = z.infer<typeof addressInput>

export const cartLineInput = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(10),
})

/** Only variant ids and quantities cross the wire — prices are re-read server-side. */
export const quoteInput = z.object({
  items: z.array(cartLineInput).min(1, 'Your bag is empty'),
  couponCode: z.string().trim().max(40).optional(),
  state: z.enum(INDIAN_STATES).optional(),
})

export const placeOrderInput = z.object({
  items: z.array(cartLineInput).min(1, 'Your bag is empty'),
  email: z.string().trim().email('Enter a valid email').max(160).optional(),
  shippingAddress: addressInput,
  billingSameAsShipping: z.boolean().default(true),
  billingAddress: addressInput.optional(),
  couponCode: z.string().trim().max(40).optional(),
  paymentMethod: z.enum(['RAZORPAY', 'COD']),
  customerNote: z.string().trim().max(500).optional(),
})

export type PlaceOrderInput = z.infer<typeof placeOrderInput>

export const verifyPaymentInput = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
})
