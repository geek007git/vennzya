/**
 * The full catalogue of things a staff account can be allowed to do.
 * OWNER bypasses these checks; STAFF holds an explicit grant per key, so a
 * helper can be given order handling without touching pricing or payouts.
 */
export const PERMISSIONS = {
  'products.manage': 'Create, edit and archive products, variants, stock and images',
  'orders.manage': 'View orders, update status, add tracking, record COD and refunds',
  'customers.view': 'View customer contact details and order history',
  'discounts.manage': 'Create and manage coupons and promotions',
  'content.manage': 'Edit banners, collections, testimonials, FAQ and policy pages',
  'support.manage': 'Read and respond to contact form submissions',
  'staff.manage': 'Invite staff, set their permissions and revoke access',
} as const

export type PermissionKey = keyof typeof PERMISSIONS

export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as PermissionKey[]

export const PERMISSION_GROUPS: { label: string; keys: PermissionKey[] }[] = [
  { label: 'Catalogue', keys: ['products.manage', 'content.manage'] },
  { label: 'Sales', keys: ['orders.manage', 'discounts.manage', 'customers.view'] },
  { label: 'Support', keys: ['support.manage'] },
  { label: 'Administration', keys: ['staff.manage'] },
]
