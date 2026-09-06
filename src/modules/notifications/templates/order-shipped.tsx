import { Button, Hr, Text } from '@react-email/components'
import { brand, EmailLayout, heading, paragraph, rule } from './layout'
import type { OrderEmailAddress } from './order-confirmed'

export interface OrderShippedEmailProps {
  orderNumber: string
  orderUrl: string
  courierName: string
  trackingNumber: string
  trackingUrl: string | null
  shippingAddress: OrderEmailAddress | null
}

export function OrderShippedEmail({
  courierName,
  orderNumber,
  orderUrl,
  shippingAddress,
  trackingNumber,
  trackingUrl,
}: OrderShippedEmailProps) {
  return (
    <EmailLayout preview={`Order ${orderNumber} is on its way`}>
      <Text style={heading}>Your order is on its way</Text>
      <Text style={paragraph}>
        Order <strong>{orderNumber}</strong> has left our studio with {courierName}. Tracking number{' '}
        <strong>{trackingNumber}</strong>. Deliveries usually take 3–7 business days.
      </Text>

      <Button
        href={trackingUrl ?? orderUrl}
        style={{
          backgroundColor: brand.accent,
          borderRadius: '8px',
          color: '#fdfbf7',
          fontSize: '14px',
          fontWeight: 600,
          padding: '12px 20px',
          textDecoration: 'none',
        }}
      >
        {trackingUrl ? 'Track your parcel' : 'View your order'}
      </Button>

      {shippingAddress && (
        <>
          <Hr style={rule} />
          <Text style={{ color: brand.text, fontSize: '14px', fontWeight: 600, margin: '0 0 6px' }}>
            Delivering to
          </Text>
          <Text style={{ ...paragraph, margin: 0 }}>
            {shippingAddress.fullName}
            <br />
            {[shippingAddress.line1, shippingAddress.line2].filter(Boolean).join(', ')}
            <br />
            {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}
          </Text>
        </>
      )}
    </EmailLayout>
  )
}

export default OrderShippedEmail
