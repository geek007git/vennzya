'use client'

import { X, ZoomIn } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export interface GalleryImage {
  id: string
  url: string
  altText: string | null
  blurDataUrl: string | null
  variantId: string | null
}

export function ProductGallery({
  images,
  productName,
  activeVariantId,
}: {
  images: GalleryImage[]
  productName: string
  activeVariantId: string | null
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  // A variant with its own photography takes over the main frame when selected.
  const variantImageIndex = activeVariantId
    ? images.findIndex((image) => image.variantId === activeVariantId)
    : -1
  const displayIndex = variantImageIndex >= 0 ? variantImageIndex : activeIndex
  const active = images[displayIndex] ?? images[0]

  if (!active) {
    return (
      <div className="flex aspect-4/5 items-center justify-center rounded-[var(--radius-card)] bg-espresso-100 text-sm text-muted-foreground">
        No image available
      </div>
    )
  }

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row">
      {images.length > 1 && (
        <div
          className="flex gap-3 overflow-x-auto md:flex-col md:overflow-visible"
          role="tablist"
          aria-label="Product images"
        >
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              role="tab"
              aria-selected={index === displayIndex}
              aria-label={`View image ${index + 1} of ${images.length}`}
              onClick={() => setActiveIndex(index)}
              className={cn(
                'relative size-16 shrink-0 overflow-hidden rounded-md border transition-colors md:size-20',
                index === displayIndex ? 'border-espresso-800' : 'border-border hover:border-espresso-400',
              )}
            >
              <Image
                src={image.url}
                alt=""
                aria-hidden
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <div className="relative flex-1">
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          aria-label="Open full size image"
          className="group relative block aspect-4/5 w-full overflow-hidden rounded-[var(--radius-card)] bg-espresso-100"
        >
          <Image
            src={active.url}
            alt={active.altText ?? productName}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 45vw"
            placeholder={active.blurDataUrl ? 'blur' : 'empty'}
            blurDataURL={active.blurDataUrl ?? undefined}
            className="object-cover transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:scale-105"
          />
          <span className="absolute bottom-3 right-3 inline-flex size-9 items-center justify-center rounded-full bg-cream-50/90 text-espresso-800 opacity-0 transition-opacity group-hover:opacity-100">
            <ZoomIn className="size-4" aria-hidden />
          </span>
        </button>
      </div>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-3xl p-0">
          <DialogTitle className="sr-only">{productName}</DialogTitle>
          <div className="relative aspect-4/5 w-full">
            <Image
              src={active.url}
              alt={active.altText ?? productName}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-contain"
            />
          </div>
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-full bg-cream-50/90 p-2 text-espresso-900"
          >
            <X className="size-4" aria-hidden />
          </button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
