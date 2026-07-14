/**
 * Step definitions for the Cart Management feature.
 *
 * Each function here is mapped to a Gherkin step in cart.feature via decorators:
 *   Given(pattern, fn)  — sets up preconditions (auth, cart state)
 *   When(pattern, fn)   — performs user actions (navigate, click)
 *   Then(pattern, fn)   — asserts outcomes (visible text, URLs, counts)
 *
 * Steps receive the QuickShopWorld instance as `this`, giving them access to
 * the browser page, page objects, and shared test data (testUser, seededProduct).
 *
 * Parameterised steps use Cucumber expressions:
 *   {string}  — matches a double-quoted string in the Gherkin step
 *   {int}     — matches an integer number
 */
import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { QuickShopWorld } from '../support/world'
import { TestDataFactory } from '../../../src/utils/TestDataFactory'
import { CartApiClient } from '../../../src/api/CartApiClient'
import { ENV } from '../../../src/config/env'

// ── Given steps — set up preconditions ────────────────────────────────────────

/**
 * Creates a unique test user via the API and logs them in through the UI.
 * The testUser is stored on the World so later steps can use its token.
 * Must run before any step that requires authentication.
 */
Given('I am logged in as a registered user', async function (this: QuickShopWorld) {
  const factory = new TestDataFactory(ENV.API_URL)
  this.testUser = await factory.createTestUser()

  await this.loginPage.goto()
  await this.loginPage.loginAndWait(this.testUser.email, this.testUser.password)
})

/**
 * Clears cookies to simulate a user who is not logged in.
 * QuickShop uses localStorage for the JWT token, but clearing cookies
 * plus no prior login means the app has no auth context.
 */
Given('I am not logged in', async function (this: QuickShopWorld) {
  await this.page.context().clearCookies()
})

/** Navigates to the home page (product catalog). */
Given('I am on the products page', async function (this: QuickShopWorld) {
  await this.productListPage.goto()
})

/**
 * Seeds 1 unit of any in-stock product into the test user's cart via the API.
 * Faster than clicking "Add to Cart" in the browser — focuses the test on cart behaviour.
 * Stores the product in this.seededProduct so Then steps can reference it.
 */
Given('I have 1 unit of a product in my cart', async function (this: QuickShopWorld) {
  if (!this.testUser) throw new Error('testUser not initialized — run "I am logged in" step first')

  const factory = new TestDataFactory(ENV.API_URL)
  this.seededProduct = await factory.getFirstInStockProduct()
  await factory.seedCart(this.testUser.token, this.seededProduct.id, 1)
})

/**
 * Seeds 1 unit of a product that has at least 2 units in stock.
 * Required for quantity-increase tests — if stock is 1, the + button is
 * disabled and the test cannot increase the quantity.
 */
Given('I have 1 unit of a product with at least 2 in stock in my cart', async function (this: QuickShopWorld) {
  if (!this.testUser) throw new Error('testUser not initialized')

  const factory = new TestDataFactory(ENV.API_URL)
  this.seededProduct = await factory.getProductWithStock(2)  // stock >= 2
  await factory.seedCart(this.testUser.token, this.seededProduct.id, 1)
})

// ── When steps — perform user actions ─────────────────────────────────────────

/** Navigates the browser to /cart. */
When('I navigate to the cart page', async function (this: QuickShopWorld) {
  await this.cartPage.goto()
})

/**
 * Clicks "Add to Cart" for the first in-stock product on the list page.
 * The button text parameter is accepted but unused — the method always
 * clicks "Add to Cart" (any other button text would be a separate step).
 */
When('I click {string} for the first available product', async function (
  this: QuickShopWorld,
  _buttonText: string,
) {
  await this.productListPage.clickFirstAddToCart()
})

/** Clicks the + (increase) quantity button for the seeded product in the cart. */
When('I click the increase quantity button for that product', async function (this: QuickShopWorld) {
  if (!this.seededProduct) throw new Error('seededProduct not set')
  await this.cartPage.increaseQuantity(this.seededProduct.name)
})

/**
 * Generic step for clicking a named button scoped to the seeded product's row.
 * Currently handles "Remove" — extend the if/else for other per-item buttons.
 */
When('I click the {string} button for that product', async function (
  this: QuickShopWorld,
  buttonText: string,
) {
  if (!this.seededProduct) throw new Error('seededProduct not set')
  if (buttonText === 'Remove') {
    await this.cartPage.removeItem(this.seededProduct.name)
  }
})

/**
 * Generic step for clicking page-level links by their visible text.
 * Routes to the specific page object method for known links, falls back
 * to a generic role-based click for anything else.
 */
When('I click {string}', async function (this: QuickShopWorld, linkText: string) {
  if (linkText === 'Proceed to Checkout') {
    await this.cartPage.proceedToCheckout()
  } else if (linkText === 'Continue Shopping') {
    await this.cartPage.continueShopping()
  } else {
    await this.page.getByRole('link', { name: linkText }).click()
  }
})

// ── Then steps — assert outcomes ──────────────────────────────────────────────

/** Asserts that a heading with the given text is visible on the page. */
Then('I should see the {string} heading', async function (this: QuickShopWorld, headingText: string) {
  await expect(this.page.getByRole('heading', { name: headingText })).toBeVisible()
})

/** Asserts that the given text is visible anywhere on the page. */
Then('I should see {string}', async function (this: QuickShopWorld, text: string) {
  await expect(this.page.getByText(text)).toBeVisible()
})

/** Asserts that a link with the given text is visible. */
Then('I should see a {string} link', async function (this: QuickShopWorld, linkText: string) {
  await expect(this.page.getByRole('link', { name: linkText }).first()).toBeVisible()
})

/** Asserts that a button or link with the given text is visible. */
Then('I should see a {string} button', async function (this: QuickShopWorld, buttonText: string) {
  // "Proceed to Checkout" is rendered as a link (<a>) not a <button> element
  const locator = this.page.getByRole('link', { name: buttonText })
    .or(this.page.getByRole('button', { name: buttonText }))
  await expect(locator.first()).toBeVisible()
})

/**
 * Asserts that the green success toast appeared and contains "added to cart".
 * The toast auto-dismisses after 3.5s — this step must run immediately after
 * the add-to-cart action.
 */
Then('I should see a success toast notification', async function (this: QuickShopWorld) {
  const toast = await this.cartPage.getToastMessage()
  expect(toast).toContain('added to cart')
})

/**
 * Waits for the navbar cart count badge to appear and asserts it shows > 0.
 * Uses page.waitForFunction() to poll the DOM until the React state update
 * that refreshes the cart count has been processed and rendered.
 */
Then('the cart count badge in the navbar should be greater than 0', async function (this: QuickShopWorld) {
  await this.page.waitForFunction(() => {
    const badge = document.querySelector('nav a[href="/cart"] span')
    return badge && parseInt(badge.textContent || '0') > 0
  }, { timeout: 5000 })
  const count = await this.cartPage.getCartCount()
  expect(count).toBeGreaterThan(0)
})

/** Asserts that the seeded product's cart row is visible on the cart page. */
Then('I should see the product listed in the cart', async function (this: QuickShopWorld) {
  if (!this.seededProduct) throw new Error('seededProduct not set')
  await expect(this.cartPage.cartItem(this.seededProduct.name)).toBeVisible()
})

/** Asserts that a section heading is visible (e.g. "Order Summary"). */
Then('I should see the {string} section', async function (this: QuickShopWorld, sectionHeading: string) {
  await expect(this.page.getByRole('heading', { name: sectionHeading })).toBeVisible()
})

/** Asserts that the quantity displayed for the seeded product matches the expected value. */
Then('the item quantity should be {int}', async function (this: QuickShopWorld, expectedQty: number) {
  if (!this.seededProduct) throw new Error('seededProduct not set')
  const qty = await this.cartPage.getQuantity(this.seededProduct.name)
  expect(qty).toBe(expectedQty)
})

/**
 * Asserts that the displayed line total equals price × current quantity.
 * Uses toBeCloseTo(value, 2) to handle floating-point rounding (e.g. $29.999... → $30.00).
 */
Then('the subtotal should reflect the updated quantity', async function (this: QuickShopWorld) {
  if (!this.seededProduct) throw new Error('seededProduct not set')
  const qty = await this.cartPage.getQuantity(this.seededProduct.name)
  const lineTotal = await this.cartPage.getLineTotal(this.seededProduct.name)
  expect(lineTotal).toBeCloseTo(this.seededProduct.price * qty, 2)
})

/** Asserts the − button is disabled — enforces that quantity cannot drop below 1. */
Then('the decrease quantity button should be disabled', async function (this: QuickShopWorld) {
  if (!this.seededProduct) throw new Error('seededProduct not set')
  expect(await this.cartPage.isDecreaseButtonDisabled(this.seededProduct.name)).toBe(true)
})

/** Asserts the cart is in its empty state (no items, empty message visible). */
Then('the cart should be empty', async function (this: QuickShopWorld) {
  expect(await this.cartPage.isEmpty()).toBe(true)
})

/** Asserts the browser URL matches /checkout after clicking Proceed to Checkout. */
Then('I should be navigated to the checkout page', async function (this: QuickShopWorld) {
  await expect(this.page).toHaveURL(/\/checkout/)
})

/** Asserts the browser URL is the home page after clicking Continue Shopping. */
Then('I should be navigated to the products page', async function (this: QuickShopWorld) {
  await expect(this.page).toHaveURL('/')
})

/** Asserts the browser URL matches /auth/login — triggered when an unauthenticated
 *  user tries to access a protected page and the app redirects them. */
Then('I should be redirected to the login page', async function (this: QuickShopWorld) {
  await expect(this.page).toHaveURL(/\/auth\/login/)
})
