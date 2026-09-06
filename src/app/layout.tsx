import type { Metadata, Viewport } from 'next'
import { Inter, Manrope } from 'next/font/google'
import { Toaster } from 'sonner'
import { siteConfig } from '@/lib/site-config'
import { TRPCProvider } from '@/trpc/react'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
  weight: ['500', '600', '700', '800'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — Women’s Clothing, Jewellery & Accessories`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    'women’s clothing India',
    'online jewellery India',
    'fashion accessories',
    'ethnic wear',
    'Vennzya Fashion Hub',
  ],
  openGraph: {
    type: 'website',
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.description,
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#4a3728',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${manrope.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <TRPCProvider>{children}</TRPCProvider>
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  )
}
