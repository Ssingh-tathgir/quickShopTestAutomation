import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { QuickShopWorld } from '../support/world'
import { TestDataFactory } from '../../../src/utils/TestDataFactory'
import { CartApiClient } from '../../../src/api/CartApiClient'
import { ENV } from '../../../src/config/env'

// ── Given ─────────────────────────────────────────────────────────────────────

Given('I am logged in as a registered user', async function (this: QuickShopWorld) {
  const factory = new TestDataFactory(ENV.API_URL)
  this.testUser = await factory.createTestUser()

  await this.loginPage.goto()
  await this.loginPage.loginAndWait(this.testUser.email, this.testUser.password)
})

Given('I am not logged in', async function (this: QuickShopWorld) {
  // Start a fresh context with no auth — no action needed
  await this.page.context().clearCookies()
})

Given('I am on the products page', async function (this: QuickShopWorld) {
  await this.productListPage.goto()
})

Given('I have 1 unit of a product in my cart', async function (this: QuickShopWorld) {
  if (!this.testUser) throw new Error('testUser not initialized — run "I am logged in" step first')

  const factory = new TestDataFactory(ENV.API_URL)
  this.seededProduct = await factory.getFirstInStockProduct()
  await factory.seedCart(this.testUser.token, this.seededProduct.id, 1)
})

Given('I have 1 unit of a product with at least 2 in stock in my cart', async function (this: QuickShopWorld) {
  if (!this.testUser) throw new Error('testUser not initialized')

  const factory = new TestDataFactory(ENV.API_URL)
  this.seededProduct = await factory.getProductWithStock(2)
  await factory.seedCart(this.testUser.token, this.seededProduct.id, 1)
})

// ── When ──────────────────────────────────────────────────────────────────────

When('I navigate to the cart page', async function (this: QuickShopWorld) {
  await this.cartPage.goto()
})

When('I click {string} for the first available product', async function (
  this: QuickShopWorld,
  _buttonText: string,
) {
  await this.productListPage.clickFirstAddToCart()
})

When('I click the increase quantity button for that product', async function (this: QuickShopWorld) {
  if (!this.seededProduct) throw new Error('seededProduct not set')
  await this.cartPage.increaseQuantity(this.seededProduct.name)
})

When('I click the {string} button for that product', async function (
  this: QuickShopWorld,
  buttonText: string,
) {
  if (!this.seededProduct) throw new Error('seededProduct not set')
  if (buttonText === 'Remove') {
    await this.cartPage.removeItem(this.seededProduct.name)
  }
})

When('I click {string}', async function (this: QuickShopWorld, linkText: string) {
  if (linkText === 'Proceed to Checkout') {
    await this.cartPage.proceedToCheckout()
  } else if (linkText === 'Continue Shopping') {
    await this.cartPage.continueShopping()
  } else {
    await this.page.getByRole('link', { name: linkText }).click()
  }
})

// ── Then ──────────────────────────────────────────────────────────────────────

Then('I should see the {string} heading', async function (this: QuickShopWorld, headingText: string) {
  await expect(this.page.getByRole('heading', { name: headingText })).toBeVisible()
})

Then('I should see {string}', async function (this: QuickShopWorld, text: string) {
  await expect(this.page.getByText(text)).toBeVisible()
})

Then('I should see a {string} link', async function (this: QuickShopWorld, linkText: string) {
  await expect(this.page.getByRole('link', { name: linkText }).first()).toBeVisible()
})

Then('I should see a {string} button', async function (this: QuickShopWorld, buttonText: string) {
  const locator = this.page.getByRole('link', { name: buttonText })
    .or(this.page.getByRole('button', { name: buttonText }))
  await expect(locator.first()).toBeVisible()
})

Then('I should see a success toast notification', async function (this: QuickShopWorld) {
  const toast = await this.cartPage.getToastMessage()
  expect(toast).toContain('added to cart')
})

Then('the cart count badge in the navbar should be greater than 0', async function (this: QuickShopWorld) {
  await this.page.waitForFunction(() => {
    const badge = document.querySelector('nav a[href="/cart"] span')
    return badge && parseInt(badge.textContent || '0') > 0
  }, { timeout: 5000 })
  const count = await this.cartPage.getCartCount()
  expect(count).toBeGreaterThan(0)
})

Then('I should see the product listed in the cart', async function (this: QuickShopWorld) {
  if (!this.seededProduct) throw new Error('seededProduct not set')
  await expect(this.cartPage.cartItem(this.seededProduct.name)).toBeVisible()
})

Then('I should see the {string} section', async function (this: QuickShopWorld, sectionHeading: string) {
  await expect(this.page.getByRole('heading', { name: sectionHeading })).toBeVisible()
})

Then('the item quantity should be {int}', async function (this: QuickShopWorld, expectedQty: number) {
  if (!this.seededProduct) throw new Error('seededProduct not set')
  const qty = await this.cartPage.getQuantity(this.seededProduct.name)
  expect(qty).toBe(expectedQty)
})

Then('the subtotal should reflect the updated quantity', async function (this: QuickShopWorld) {
  if (!this.seededProduct) throw new Error('seededProduct not set')
  const qty = await this.cartPage.getQuantity(this.seededProduct.name)
  const lineTotal = await this.cartPage.getLineTotal(this.seededProduct.name)
  expect(lineTotal).toBeCloseTo(this.seededProduct.price * qty, 2)
})

Then('the decrease quantity button should be disabled', async function (this: QuickShopWorld) {
  if (!this.seededProduct) throw new Error('seededProduct not set')
  expect(await this.cartPage.isDecreaseButtonDisabled(this.seededProduct.name)).toBe(true)
})

Then('the cart should be empty', async function (this: QuickShopWorld) {
  expect(await this.cartPage.isEmpty()).toBe(true)
})

Then('I should be navigated to the checkout page', async function (this: QuickShopWorld) {
  await expect(this.page).toHaveURL(/\/checkout/)
})

Then('I should be navigated to the products page', async function (this: QuickShopWorld) {
  await expect(this.page).toHaveURL('/')
})

Then('I should be redirected to the login page', async function (this: QuickShopWorld) {
  await expect(this.page).toHaveURL(/\/auth\/login/)
})
