import { Button, Column, Hr, Row, Section, Text } from '@react-email/components'
import { formatInrCompact } from '@/lib/format'
import { brand, EmailLayout, heading, paragraph, rule } from './layout'

export interface OrderEmailAddress {
  fullName: string
  line1: string
  line2: string | null
  city: string
  state: string
  postalCode: string
}

export interface OrderEmailItem {
  id: string
  name: string
  variantLabel: string | null
  quantity: number
  lineTotal: number
}

export interface OrderConfirmedEmailProps {
  orderNumber: string
  orderUrl: string
  isCod: boolean
  items: OrderEmailItem[]
  subtotal: number
  discountAmount: number
  shippingFee: number
  gstTotal: number
  totalAmount: number
  shippingAddress: OrderEmailAddress | null
}

const label = { color: brand.muted, fontSize: '13px', margin: 0 }
const value = { color: brand.text, fontSize: '13px', margin: 0, textAlign: 'right' as const }
const itemName = { color: brand.text, fontSize: '14px', fontWeight: 600, margin: 0 }
const itemMeta = { color: brand.muted, fontSize: '12px', margin: '2px 0 0' }

function Line({ bold = false, name, amount }: { bold?: boolean; name: string; amount: string }) {
  return (
    <Row style={{ marginBottom: '6px' }}>
      <Column>
        <Text style={bold ? { ...label, color: brand.text, fontWeight: 700 } : label}>{name}</Text>
      </Column>
      <Column>
        <Text style={bold ? { ...value, fontWeight: 700 } : value}>{amount}</Text>
      </Column>
    </Row>
  )
}

export function OrderConfirmedEmail({
  discountAmount,
  gstTotal,
  isCod,
  items,
  orderNumber,
  orderUrl,
  shippingAddress,
  shippingFee,
  subtotal,
  totalAmount,
}: OrderConfirmedEmailProps) {
  return (
    <EmailLayout preview={`Order ${orderNumber} confirmed — ${formatInrCompact(totalAmount)}`}>
      <Text style={heading}>Your order is confirmed</Text>
      <Text style={paragraph}>
        Thank you — we have order <strong>{orderNumber}</strong> and will start preparing it.
        {isCod
          ? ` Keep ${formatInrCompact(totalAmount)} ready for the delivery agent.`
          : ' Your payment has been received in full.'}
      </Text>

      <Button
        href={orderUrl}
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
        View your order
      </Button>

      <Hr style={rule} />

      <Section>
        {items.map((item) => (
          <Row key={item.id} style={{ marginBottom: '12px' }}>
            <Column>
              <Text style={itemName}>{item.name}</Text>
              <Text style={itemMeta}>
                {[item.variantLabel, `Qty ${item.quantity}`].filter(Boolean).join(' · ')}
              </Text>
            </Column>
            <Column>
              <Text style={value}>{formatInrCompact(item.lineTotal)}</Text>
            </Column>
          </Row>
        ))}
      </Section>

      <Hr style={rule} />

      <Section>
        <Line amount={formatInrCompact(subtotal)} name="Subtotal" />
        {discountAmount > 0 && (
          <Line amount={`−${formatInrCompact(discountAmount)}`} name="Discount" />
        )}
        <Line amount={shippingFee === 0 ? 'Free' : formatInrCompact(shippingFee)} name="Shipping" />
        <Line amount={formatInrCompact(gstTotal)} name="GST" />
        <Line amount={formatInrCompact(totalAmount)} bold name="Total" />
      </Section>

      {shippingAddress && (
        <>
          <Hr style={rule} />
          <Text style={{ ...itemName, marginBottom: '6px' }}>Delivering to</Text>
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

export default OrderConfirmedEmail
