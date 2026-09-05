import { expect, test } from '@playwright/test'

const OWNER_EMAIL = process.env.OWNER_EMAIL ?? 'owner@vennzya.test'
const OWNER_PASSWORD = process.env.OWNER_PASSWORD ?? 'ChangeMe!2026'

test('the admin area is closed to anonymous visitors', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/login/)
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()

  await page.goto('/admin/orders')
  await expect(page).toHaveURL(/\/admin\/login/)
})

test('wrong credentials are refused without revealing whether the account exists', async ({
  page,
}) => {
  await page.goto('/admin/login')

  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(OWNER_EMAIL)
  await page.getByLabel('Password').fill('definitely-not-the-password')
  await page.getByRole('button', { name: 'Sign in' }).click()

  // Scoped to the form: Next's route announcer is also role="alert".
  await expect(page.locator('form').getByRole('alert')).toHaveText(/didn’t match/i)
  await expect(page).toHaveURL(/\/admin\/login/)
})

test('the owner can sign in and reach the dashboard', async ({ page }) => {
  await page.goto('/admin/login')

  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(OWNER_EMAIL)
  await page.getByLabel('Password').fill(OWNER_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.waitForURL('**/admin', { timeout: 30_000 })
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()

  // On narrow screens the sidebar collapses behind a menu button.
  const menuButton = page.getByRole('button', { name: 'Open menu' })
  if (await menuButton.isVisible()) await menuButton.click()

  // The owner holds every permission, so every section is reachable.
  const nav = page.getByRole('navigation', { name: 'Admin' }).last()
  for (const label of ['Orders', 'Products', 'Stock', 'Discounts', 'Staff']) {
    await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible()
  }

  await expect(page.getByText('Recent orders')).toBeVisible()
})
