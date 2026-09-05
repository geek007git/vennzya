export interface FlatCategory {
  id: string
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  parentId: string | null
  _count: { products: number }
}

export interface CategoryNode {
  id: string
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  /** Includes products filed under child categories, not just direct ones. */
  productCount: number
  children: { id: string; name: string; slug: string; productCount: number }[]
}

/**
 * Products are filed against leaf categories ("Kurtas & Suits"), so a parent's
 * own count is always zero. Anything showing a category total has to roll the
 * children up — this is that single implementation.
 */
export function buildCategoryTree(categories: FlatCategory[]): CategoryNode[] {
  return categories
    .filter((category) => category.parentId === null)
    .map((parent) => {
      const children = categories
        .filter((child) => child.parentId === parent.id)
        .map((child) => ({
          id: child.id,
          name: child.name,
          slug: child.slug,
          productCount: child._count.products,
        }))

      return {
        id: parent.id,
        name: parent.name,
        slug: parent.slug,
        description: parent.description,
        imageUrl: parent.imageUrl,
        productCount:
          parent._count.products + children.reduce((sum, child) => sum + child.productCount, 0),
        children,
      }
    })
}
