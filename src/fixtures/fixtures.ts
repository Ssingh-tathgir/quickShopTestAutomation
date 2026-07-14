/**
 * Custom Playwright fixtures for QuickShop tests.
 *
 * Playwright's fixture system lets tests declare what they need as parameters.
 * The framework sets up each declared fixture before the test and tears it down
 * after — tests don't need beforeEach/afterEach for common setup.
 *
 * This file extends the base `test` object with QuickShop-specific fixtures:
 *
 *   testUser            — a freshly registered user with a valid JWT token
 *   authenticatedPage   — a Page already logged in as testUser
 *   loginPage           — a LoginPage object navigated to /auth/login
 *   cartPage            — a CartPage object on an authenticated session
 *   productListPage     — a ProductListPage on an authenticated session
 *   productDetailPage   — a ProductDetailPage on an authenticated session
 *   seededCartProduct   — seeds one product into the cart, cleans up afterwards
 *
 * Usage in a test file:
 *   import { test, expect } from '../../src/fixtures/fixtures'
 *
 *   test('my test', async ({ cartPage, seededCartProduct }) => {
 *     await cartPage.goto()
 *     // cart already has seededCartProduct in it
 *   })
 */
import { test as base, Page } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'
import { CartPage } from '../pages/CartPage'
import { ProductListPage } from '../pages/ProductListPage'
import { ProductDetailPage } from '../pages/ProductDetailPage'
import { TestDataFactory, TestUser } from '../utils/TestDataFactory'
import { CartApiClient } from '../api/CartApiClient'
import { Product } from '../api/ProductApiClient'
import { ENV } from '../config/env'

/** Type declaration for all custom fixtures — tells TypeScript what each fixture provides. */
type QuickShopFixtures = {
  testUser: TestUser
  authenticatedPage: Page
  loginPage: LoginPage
  cartPage: CartPage
  productListPage: ProductListPage
  productDetailPage: ProductDetailPage
  seededCartProduct: Product
}

export const test = base.extend<QuickShopFixtures>({

  /**
   * Creates a unique test user via the registration API and logs them in.
   * The returned object contains the email, password, and JWT token.
   * Shared by other fixtures that need an authenticated session.
   */
  testUser: async ({}, use) => {
    const factory = new TestDataFactory(ENV.API_URL)
    const user = await factory.createTestUser()
    await use(user)
    // Note: test users are not deleted after the test — they accumulate
    // in the test database, which is acceptable for a dev environment.
  },

  /**
   * Returns a Playwright Page that is already logged in as testUser.
   * Performs login via the UI (fills the login form) to exercise the real auth flow.
   * Other page-based fixtures (cartPage, productListPage) depend on this.
   */
  authenticatedPage: async ({ page, testUser }, use) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.loginAndWait(testUser.email, testUser.password)
    await use(page)
  },

  /**
   * Provides a LoginPage object already navigated to /auth/login.
   * Use this in tests that specifically test login behaviour (wrong credentials,
   * error messages, etc.) — do NOT use authenticatedPage for those tests.
   */
  loginPage: async ({ page }, use) => {
    const lp = new LoginPage(page)
    await lp.goto()
    await use(lp)
  },

  /**
   * Provides a CartPage object on an authenticated session.
   * The page is NOT navigated to /cart yet — tests call cartPage.goto()
   * themselves so they can control exactly when navigation happens.
   */
  cartPage: async ({ authenticatedPage }, use) => {
    const cp = new CartPage(authenticatedPage)
    await use(cp)
  },

  /**
   * Provides a ProductListPage object on an authenticated session,
   * pre-navigated to the home page ('/').
   */
  productListPage: async ({ authenticatedPage }, use) => {
    await authenticatedPage.goto('/')
    const plp = new ProductListPage(authenticatedPage)
    await use(plp)
  },

  /**
   * Provides a ProductDetailPage object on an authenticated session.
   * Tests call productDetailPage.goto(productId) to navigate to a specific product.
   */
  productDetailPage: async ({ authenticatedPage }, use) => {
    const pdp = new ProductDetailPage(authenticatedPage)
    await use(pdp)
  },

  /**
   * Seeds the test user's cart with one unit of an in-stock product via the API.
   * Returns the Product so the test knows what to expect in the cart.
   *
   * Cleanup: removes all cart items after the test using clearCart().
   * This ensures the next test always starts with a clean cart.
   *
   * Why seed via API instead of clicking in the UI?
   * It's faster (no browser round-trip) and focuses UI tests on the feature
   * under test rather than the add-to-cart flow.
   */
  seededCartProduct: async ({ testUser }, use) => {
    const factory = new TestDataFactory(ENV.API_URL)
    const product = await factory.getFirstInStockProduct()
    await factory.seedCart(testUser.token, product.id, 1)
    await use(product)
    // Teardown: clear the cart so subsequent tests start fresh
    const cart = new CartApiClient(ENV.API_URL, testUser.token)
    await cart.clearCart().catch(() => {})
  },
})

/** Re-export expect so test files only need one import. */
export { expect } from '@playwright/test'
