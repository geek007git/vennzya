import type { Metadata } from 'next'
import { AdminPageHeader } from '@/components/admin/kit'
import { isForbidden, PermissionDenied } from '@/components/admin/products/permission-denied'
import { BLANK_PRODUCT, ProductForm } from '@/components/admin/products/product-form'
import { trpc } from '@/trpc/server'

export const metadata: Metadata = {
  title: 'New product',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function NewProductPage() {
  let categories: Awaited<ReturnType<typeof trpc.catalogAdmin.categories>>
  let options: Awaited<ReturnType<typeof trpc.catalogAdmin.options>>

  try {
    ;[categories, options] = await Promise.all([
      trpc.catalogAdmin.categories(),
      trpc.catalogAdmin.options(),
    ])
  } catch (error) {
    if (isForbidden(error)) return <PermissionDenied what="add products" />
    throw error
  }

  return (
    <div>
      <AdminPageHeader
        title="New product"
        description="It starts as a draft — publish it when you're happy."
        backHref={{ href: '/admin/products', label: 'Products' }}
      />

      <ProductForm
        mode="create"
        defaultValues={BLANK_PRODUCT}
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
