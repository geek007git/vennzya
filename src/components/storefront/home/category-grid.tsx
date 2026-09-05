import { ArrowUpRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { CategoryNode } from '@/modules/catalog/categories'

const GENERIC_FALLBACK =
  'https://images.unsplash.com/photo-1445205170230-053b83016050?w=900&q=80&auto=format&fit=crop'

export function CategoryGrid({ categories }: { categories: CategoryNode[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category, index) => (
        <Link
          key={category.id}
          href={`/shop/${category.slug}`}
          className="group relative overflow-hidden rounded-[var(--radius-card)] bg-espresso-100"
        >
          <div className="relative aspect-4/3 sm:aspect-3/4 lg:aspect-4/5">
            <Image
              src={category.imageUrl ?? GENERIC_FALLBACK}
              alt=""
              aria-hidden
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              priority={index === 0}
              className="object-cover transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-espresso-950/80 via-espresso-950/10 to-transparent" />
          </div>

          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
            <div>
              <h3 className="text-lg font-semibold text-cream-50">{category.name}</h3>
              <p className="mt-0.5 text-xs text-cream-100/75">
                {category.productCount} {category.productCount === 1 ? 'piece' : 'pieces'}
              </p>
            </div>
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-cream-50/15 text-cream-50 backdrop-blur-sm transition-colors group-hover:bg-cream-50 group-hover:text-espresso-900">
              <ArrowUpRight className="size-4" aria-hidden />
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}
