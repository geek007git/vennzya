import { expect, type Page, test } from '@playwright/test'

/**
 * The money path. If this breaks, the business stops taking orders — so it
 * covers the whole journey: browse → variant → bag → address → COD → order.
 */

async function openFirstInStockProduct(page: Page): Promise<string> {
  await page.goto('/shop')

  const link = page.locator('[data-testid="product-card-link"][data-in-stock="true"]').first()
  await expect(link).toBeVisible()

  const href = await link.getAttribute('href')
  expect(href).toBeTruthy()

  // Navigating by URL rather than clicking: a click during streaming hydration
  // can be swallowed, and this test is about checkout, not link plumbing.
  await page.goto(href as string)
  await expect(page.getByTestId('add-to-bag')).toBeVisible()

  return (await page.getByRole('heading', { level: 1 }).innerText()).trim()
}

/** Picks the first still-available value on every option axis of the product. */
async function chooseVariant(page: Page) {
  for (const option of await page.getByTestId('product-option').all()) {
    const choice = option.locator('button:not([disabled])').first()
    if (await choice.count()) await choice.click()
  }
}

/** Scoped to the form: the footer also exposes an "Email" label. */
function checkoutForm(page: Page) {
  return page.locator('form')
}

/**
 * Queried by accessible name rather than label text: required fields render a
 * visual asterisk inside the label, which is aria-hidden but still part of the
 * label's raw text.
 */
async function fillDeliveryDetails(page: Page) {
  const form = checkoutForm(page)

  await form.getByRole('textbox', { name: 'Full name', exact: true }).fill('Ananya Iyer')
  await form.getByRole('textbox', { name: 'Mobile number', exact: true }).fill('9876543210')
  await form.getByRole('textbox', { name: 'Email', exact: true }).fill('ananya.iyer@example.com')
  await form
    .getByRole('textbox', { name: 'Address', exact: true })
    .fill('12 Nungambakkam High Road')
  await form.getByRole('textbox', { name: 'PIN code', exact: true }).fill('600034')
  await form.getByRole('textbox', { name: 'City', exact: true }).fill('Chennai')

  await form.getByRole('combobox', { name: 'State' }).click()
  await page.getByRole('option', { name: 'Tamil Nadu', exact: true }).click()
}

test('a guest can buy an item with cash on delivery', async ({ page }) => {
  const productName = await openFirstInStockProduct(page)

  await chooseVariant(page)
  await page.getByTestId('add-to-bag').click()
  await expect(page.getByText('Added to bag')).toBeVisible()

  await page.goto('/checkout')
  await fillDeliveryDetails(page)

  await page.getByText('Cash on delivery').click()

  // The total is priced server-side, so wait for the quote before reading it.
  await expect(page.getByTestId('order-total')).toHaveText(/₹/)
  const quotedTotal = await page.getByTestId('order-total').innerText()

  await page.getByRole('button', { name: /Place order/i }).click()

  await page.waitForURL(/\/order-confirmation\//, { timeout: 30_000 })
  await expect(page.getByRole('heading', { name: /Thank you for your order/i })).toBeVisible()
  await expect(page.getByTestId('order-number')).toHaveText(/VFH-\d{4}-\d{5}/)
  await expect(page.getByText('Pay on delivery')).toBeVisible()
  await expect(page.getByText(productName).first()).toBeVisible()

  // What the shopper was quoted must be what the order records.
  await expect(page.getByTestId('order-total')).toHaveText(quotedTotal)
})

test('the bag survives a page reload', async ({ page }) => {
  await openFirstInStockProduct(page)
  await chooseVariant(page)
  await page.getByTestId('add-to-bag').click()
  await expect(page.getByText('Added to bag')).toBeVisible()

  await page.reload()
  await page.goto('/cart')

  await expect(page.getByRole('heading', { name: 'Your bag' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Proceed to checkout' })).toBeVisible()
})

test('checkout refuses an invalid PIN code and phone number', async ({ page }) => {
  await openFirstInStockProduct(page)
  await chooseVariant(page)
  await page.getByTestId('add-to-bag').click()

  await page.goto('/checkout')

  const form = checkoutForm(page)
  await form.getByRole('textbox', { name: 'Full name', exact: true }).fill('Test Person')
  await form.getByRole('textbox', { name: 'Mobile number', exact: true }).fill('12345')
  await form.getByRole('textbox', { name: 'Address', exact: true }).fill('1 Test Street')
  await form.getByRole('textbox', { name: 'PIN code', exact: true }).fill('000000')
  await form.getByRole('textbox', { name: 'City', exact: true }).fill('Chennai')
  await form.getByRole('combobox', { name: 'State' }).click()
  await page.getByRole('option', { name: 'Tamil Nadu', exact: true }).click()

  await page.getByRole('button', { name: /Place order|Pay ₹/i }).click()

  await expect(page.getByText('Enter a valid 10-digit mobile number')).toBeVisible()
  await expect(page.getByText('Enter a valid 6-digit PIN code')).toBeVisible()
  await expect(page).toHaveURL(/\/checkout/)
})
