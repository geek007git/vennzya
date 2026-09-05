import { Headset, PackageCheck, RotateCcw, ShieldCheck, Truck } from 'lucide-react'
import { siteConfig } from '@/lib/site-config'

const ITEMS = [
  {
    icon: PackageCheck,
    title: 'Quality you can feel',
    body: 'Every piece is checked by hand before it leaves us.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure payments',
    body: 'UPI, cards and netbanking, processed by Razorpay.',
  },
  {
    icon: Truck,
    title: 'Reliable delivery',
    body: 'Tracked shipping to 19,000+ pin codes across India.',
  },
  {
    icon: RotateCcw,
    title: 'Easy returns',
    body: '7-day returns on eligible items, no awkward questions.',
  },
  {
    icon: Headset,
    title: 'Real people on WhatsApp',
    body: siteConfig.supportHours,
  },
]

export function TrustStrip() {
  return (
    <div className="grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-border bg-border sm:grid-cols-2 lg:grid-cols-5">
      {ITEMS.map((item) => (
        <div key={item.title} className="flex flex-col gap-2 bg-card p-5">
          <item.icon className="size-5 text-espresso-600" aria-hidden />
          <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">{item.body}</p>
        </div>
      ))}
    </div>
  )
}
