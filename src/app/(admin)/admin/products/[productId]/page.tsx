import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AdminPageHeader } from '@/components/admin/kit'
import { isForbidden, PermissionDenied } from '@/components/admin/products/permission-denied'
import { ProductForm } from '@/components/admin/products/product-form'
import type { ProductFormInput } from '@/components/admin/products/product-form-schema'
import { trpc } from '@/trpc/server'

export const metadata: Metadata = {
  title: 'Edit product',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ productId: string }>
}) {
  const { productId } = await params

  let product: Awaited<ReturnType<typeof trpc.catalogAdmin.productById>>
  let categories: Awaited<ReturnType<typeof trpc.catalogAdmin.categories>>
  let options: Awaited<ReturnType<typeof trpc.catalogAdmin.options>>

  try {
    ;[product, categories, options] = await Promise.all([
      trpc.catalogAdmin.productById({ productId }),
      trpc.catalogAdmin.categories(),
      trpc.catalogAdmin.options(),
    ])
  } catch (error) {
    if (isForbidden(error)) return <PermissionDenied what="edit products" />
    notFound()
  }

  const defaultValues: ProductFormInput = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    shortDescription: product.shortDescription,
    status: product.status,
    hsnCode: product.hsnCode,
    gstRatePercent: product.gstRatePercent,
    brand: product.brand,
    careInstructions: product.careInstructions,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    isFeatured: product.isFeatured,
    categoryIds: product.categoryIds,
    optionIds: product.optionIds,
    variants: product.variants,
    images: product.images,
  }

  return (
    <div>
      <AdminPageHeader
        title={product.name}
        description={`Editing ${product.status.toLowerCase()} product · /${product.slug}`}
        backHref={{ href: '/admin/products', label: 'Products' }}
      />

      <ProductForm
        mode="edit"
        defaultValues={defaultValues}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          parentId: category.parentId,
        }))}
        options={options}
      />
    </div>
  )
}
