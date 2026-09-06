import { describe, expect, it } from 'vitest'
import {
  type OrderEmailSource,
  orderConfirmedEmail,
  orderConfirmedProps,
  orderShippedEmail,
  orderUrl,
} from './messages'

const APP_URL = 'https://vennzya.test'

function anOrder(overrides: Partial<OrderEmailSource> = {}): OrderEmailSource {
  return {
    id: 'ord_1',
    orderNumber: 'VFH-2627-00007',
    guestAccessToken: 'tok_abc',
    paymentMethod: 'COD',
    contactEmail: 'ananya@example.com',
    subtotal: 2000,
    discountAmount: 200,
    shippingFee: 0,
    cgstAmount: 45,
    sgstAmount: 45,
    igstAmount: 0,
    totalAmount: 1800,
    items: [
      {
        id: 'item_1',
        productNameSnapshot: 'Kanchipuram Silk Saree',
        variantAttributesSnapshot: { Colour: 'Maroon' },
        quantity: 2,
        lineTotal: 1800,
      },
    ],
    addresses: [
      {
        kind: 'SHIPPING',
        fullName: 'Ananya Iyer',
        line1: '12 Nungambakkam High Road',
        line2: null,
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600034',
      },
      {
        kind: 'BILLING',
        fullName: 'Ananya Iyer',
        line1: '12 Nungambakkam High Road',
        line2: null,
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600034',
      },
    ],
    ...overrides,
  }
}

describe('orderUrl', () => {
  it('carries the guest token so a signed-out shopper can open the link', () => {
    expect(orderUrl(anOrder(), APP_URL)).toBe(
      'https://vennzya.test/order-confirmation/ord_1?token=tok_abc',
    )
  })

  it('omits the token once the order belongs to an account', () => {
    expect(orderUrl(anOrder({ guestAccessToken: null }), APP_URL)).toBe(
      'https://vennzya.test/order-confirmation/ord_1',
    )
  })
})

describe('orderConfirmedProps', () => {
  it('sums the three GST components into one displayed figure', () => {
    expect(orderConfirmedProps(anOrder(), APP_URL).gstTotal).toBe(90)
    expect(
      orderConfirmedProps(anOrder({ cgstAmount: 0, sgstAmount: 0, igstAmount: 90 }), APP_URL)
        .gstTotal,
    ).toBe(90)
  })

  it('labels the variant from its attribute snapshot, and drops it when empty', () => {
    expect(orderConfirmedProps(anOrder(), APP_URL).items[0]?.variantLabel).toBe('Colour Maroon')

    const plain = anOrder({
      items: [
        {
          id: 'item_1',
          productNameSnapshot: 'Gift card',
          variantAttributesSnapshot: {},
          quantity: 1,
          lineTotal: 500,
        },
      ],
    })
    expect(orderConfirmedProps(plain, APP_URL).items[0]?.variantLabel).toBeNull()
  })

  it('picks the shipping address, never the billing one', () => {
    const props = orderConfirmedProps(
      anOrder({
        addresses: [
          {
            kind: 'BILLING',
            fullName: 'Accounts Payable',
            line1: '1 Finance Street',
            line2: null,
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400001',
          },
          {
            kind: 'SHIPPING',
            fullName: 'Ananya Iyer',
            line1: '12 Nungambakkam High Road',
            line2: 'Flat 3B',
            city: 'Chennai',
            state: 'Tamil Nadu',
            postalCode: '600034',
          },
        ],
      }),
      APP_URL,
    )

    expect(props.shippingAddress?.fullName).toBe('Ananya Iyer')
    expect(props.shippingAddress?.line2).toBe('Flat 3B')
  })
})

describe('rendered emails', () => {
  it('states the amount to keep ready for a COD order', async () => {
    const { html, subject, text } = await orderConfirmedEmail(anOrder(), APP_URL)

    expect(subject).toBe('Order VFH-2627-00007 confirmed')
    expect(text).toContain('₹1,800')
    expect(text).toContain('Keep')
    expect(html).toContain('https://vennzya.test/order-confirmation/ord_1?token=tok_abc')
  })

  it('tells a prepaid shopper the payment landed rather than to keep cash ready', async () => {
    const { text } = await orderConfirmedEmail(anOrder({ paymentMethod: 'RAZORPAY' }), APP_URL)

    expect(text).toContain('payment has been received')
    expect(text).not.toContain('Keep ₹')
  })

  it('links the courier tracking url when there is one', async () => {
    const { html, subject } = await orderShippedEmail(anOrder(), APP_URL, {
      courierName: 'Delhivery',
      trackingNumber: 'DL123456789IN',
      trackingUrl: 'https://delhivery.test/track/DL123456789IN',
    })

    expect(subject).toBe('Order VFH-2627-00007 has shipped')
    expect(html).toContain('https://delhivery.test/track/DL123456789IN')
  })

  it('falls back to the order page when the courier gave no tracking url', async () => {
    const { html } = await orderShippedEmail(anOrder(), APP_URL, {
      courierName: 'India Post',
      trackingNumber: 'IP987654321IN',
      trackingUrl: null,
    })

    expect(html).toContain('https://vennzya.test/order-confirmation/ord_1?token=tok_abc')
  })
})
