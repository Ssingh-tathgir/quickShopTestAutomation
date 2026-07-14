/**
 * Cucumber World — shared test context for all BDD scenarios.
 *
 * In Cucumber, a "World" is an object that is created fresh for each scenario
 * and passed as `this` to every Given/When/Then step function. It holds the
 * browser session, page objects, and any data shared between steps.
 *
 * Why a custom World instead of using module-level variables?
 * Each scenario gets its own isolated World instance. This means browser state
 * (open pages, cookies, localStorage) is fully reset between scenarios without
 * any manual cleanup in the steps themselves.
 *
 * Browser lifecycle:
 *   Before hook — launches Chromium, creates a browser context and page,
 *                 and initialises all page objects pointing at that page.
 *   After hook  — clears the cart (best-effort), then closes page/context/browser.
 */
import { setWorldConstructor, World, IWorldOptions, Before, After } from '@cucumber/cucumber'
import { Browser, BrowserContext, Page, chromium } from 'playwright'
import { LoginPage } from '../../../src/pages/LoginPage'
import { CartPage } from '../../../src/pages/CartPage'
import { ProductListPage } from '../../../src/pages/ProductListPage'
import { ProductDetailPage } from '../../../src/pages/ProductDetailPage'
import { TestDataFactory, TestUser } from '../../../src/utils/TestDataFactory'
import { CartApiClient } from '../../../src/api/CartApiClient'
import { Product } from '../../../src/api/ProductApiClient'
import { ENV } from '../../../src/config/env'

export class QuickShopWorld extends World {
  // ── Browser session ───────────────────────────────────────────────────────
  // Initialised in the Before hook; torn down in the After hook

  browser!: Browser         // The Chromium browser instance
  context!: BrowserContext  // An isolated browser context (like a fresh incognito window)
  page!: Page               // The active tab within the context

  // ── Test data shared across steps ─────────────────────────────────────────

  testUser?: TestUser   // Created in "I am logged in" step; used for cart seeding and cleanup
  seededProduct?: Product  // Set in "I have N unit(s)" step; referenced in Then assertions

  // ── Page objects ──────────────────────────────────────────────────────────
  // Initialised in initPages() — all share the same `page` instance

  loginPage!: LoginPage
  cartPage!: CartPage
  productListPage!: ProductListPage
  productDetailPage!: ProductDetailPage

  constructor(options: IWorldOptions) {
    super(options)
  }

  /**
   * Creates page object instances after the browser page has been set up.
   * Called at the end of the Before hook once this.page is available.
   */
  async initPages(): Promise<void> {
    this.loginPage = new LoginPage(this.page)
    this.cartPage = new CartPage(this.page)
    this.productListPage = new ProductListPage(this.page)
    this.productDetailPage = new ProductDetailPage(this.page)
  }
}

// Register QuickShopWorld as the class Cucumber will instantiate for each scenario
setWorldConstructor(QuickShopWorld)

/**
 * Before hook — runs once before each scenario.
 * Sets up a clean browser session and initialises page objects.
 * Using headless: true so tests run in CI without a display.
 */
Before(async function (this: QuickShopWorld) {
  this.browser = await chromium.launch({ headless: true })
  // baseURL is set on the context so page.goto('/cart') resolves to BASE_URL/cart
  this.context = await this.browser.newContext({ baseURL: ENV.BASE_URL })
  this.page = await this.context.newPage()
  await this.initPages()
})

/**
 * After hook — runs once after each scenario (even if the scenario failed).
 * Clears the cart via API so the next scenario always starts with an empty cart.
 * The try/catch ensures that a cleanup failure doesn't mask the real test failure.
 */
After(async function (this: QuickShopWorld) {
  // Only attempt cart cleanup if a user and product were set up during this scenario
  if (this.testUser && this.seededProduct) {
    try {
      const cart = new CartApiClient(ENV.API_URL, this.testUser.token)
      await cart.clearCart()
    } catch {
      // Best-effort — swallow errors so the scenario result is preserved
    }
  }
  // Always close the browser resources in reverse order of creation
  await this.page?.close()
  await this.context?.close()
  await this.browser?.close()
})
