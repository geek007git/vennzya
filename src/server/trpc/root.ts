import { dashboardRouter } from '@/modules/admin/dashboard-router'
import { catalogAdminRouter } from '@/modules/catalog/admin-router'
import { catalogRouter } from '@/modules/catalog/router'
import { checkoutRouter } from '@/modules/checkout/router'
import { contentAdminRouter } from '@/modules/content/admin-router'
import { contentRouter } from '@/modules/content/router'
import { customersRouter } from '@/modules/customers/router'
import { discountsRouter } from '@/modules/discounts/router'
import { ordersRouter } from '@/modules/orders/router'
import { staffRouter } from '@/modules/staff/router'
import { supportRouter } from '@/modules/support/router'
import { createCallerFactory, router } from './init'

export const appRouter = router({
  catalog: catalogRouter,
  catalogAdmin: catalogAdminRouter,
  checkout: checkoutRouter,
  content: contentRouter,
  contentAdmin: contentAdminRouter,
  customers: customersRouter,
  dashboard: dashboardRouter,
  discounts: discountsRouter,
  orders: ordersRouter,
  staff: staffRouter,
  support: supportRouter,
})

export type AppRouter = typeof appRouter
export const createCaller = createCallerFactory(appRouter)
