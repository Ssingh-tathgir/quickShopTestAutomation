/**
 * TestDataFactory — central utility for creating and managing test data.
 *
 * Responsibilities:
 *   1. Create isolated test users on demand via the registration API.
 *      Each user gets a unique email (timestamp-based) so tests never
 *      conflict with each other, even when run in parallel.
 *
 *   2. Provide helper methods to find usable products from the live catalog
 *      (avoids hard-coding product IDs that may change across environments).
 *
 *   3. Seed cart state via the API before a UI test starts, so the test
 *      begins with a known cart state without having to click through the UI.
 *
 * Usage pattern:
 *   - Call createTestUser() once per test suite (beforeAll / fixture)
 *   - Call seedCart() to pre-populate the cart for tests that need items
 *   - Call clearCart() in afterEach to reset state between tests
 */
import { AuthApiClient } from '../api/AuthApiClient'
import { CartApiClient } from '../api/CartApiClient'
import { ProductApiClient, Product } from '../api/ProductApiClient'
import { ENV } from '../config/env'

/** Represents a test user created by the factory — includes the auth token for API calls. */
export interface TestUser {
  firstName: string
  lastName: string
  email: string
  password: string
  token: string   // JWT access token, valid for the duration of the test run
}

export class TestDataFactory {
  private readonly auth: AuthApiClient
  private readonly products: ProductApiClient

  constructor(private readonly apiUrl: string = ENV.API_URL) {
    this.auth = new AuthApiClient(apiUrl)
    this.products = new ProductApiClient(apiUrl)
  }

  /**
   * Creates a brand-new user account and immediately logs in to obtain a token.
   *
   * The email includes a millisecond timestamp to guarantee uniqueness:
   *   test.user.1720000000000@quickshop.test
   *
   * This user exists only for the current test run. There is no teardown
   * to delete it — test accounts accumulate in the database, which is
   * acceptable for a test environment that is periodically reset.
   */
  async createTestUser(): Promise<TestUser> {
    const ts = Date.now()
    const user = {
      firstName: 'Test',
      lastName: `User${ts}`,
      email: `test.user.${ts}@quickshop.test`,
      password: ENV.TEST_USER_PASSWORD,
    }

    // Step 1: Register the account
    const { ok: regOk, data: regData, status } = await this.auth.register({
      first_name: user.firstName,
      last_name: user.lastName,
      email: user.email,
      password: user.password,
      confirm_password: user.password,
    })

    if (!regOk) {
      throw new Error(`Failed to register test user (${status}): ${JSON.stringify(regData)}`)
    }

    // Step 2: Login to get the JWT token
    const { ok: loginOk, data: loginData, status: loginStatus } = await this.auth.login(
      user.email,
      user.password,
    )

    if (!loginOk) {
      throw new Error(`Failed to login test user (${loginStatus}): ${JSON.stringify(loginData)}`)
    }

    return { ...user, token: loginData.access_token }
  }

  /**
   * Logs in an existing user (e.g. a seeded admin account) and returns the token.
   * Use createTestUser() instead when isolation between tests is needed.
   */
  async loginExistingUser(email: string, password: string): Promise<string> {
    const { ok, data, status } = await this.auth.login(email, password)
    if (!ok) throw new Error(`Login failed (${status}): ${JSON.stringify(data)}`)
    return data.access_token
  }

  /** Returns any product with at least 1 unit in stock. */
  async getFirstInStockProduct(): Promise<Product> {
    return this.products.getFirstInStockProduct()
  }

  /**
   * Returns a product with at least `minStock` units available.
   * Use this when a test needs to increase quantity (requires stock >= 2).
   */
  async getProductWithStock(minStock: number = 2): Promise<Product> {
    return this.products.getProductWithStock(minStock)
  }

  /**
   * Adds a product to the cart via API — faster than clicking "Add to Cart" in the UI.
   * Used in fixtures and Before hooks so UI tests start with a pre-populated cart.
   */
  async seedCart(token: string, productId: number, quantity: number = 1): Promise<void> {
    const cart = new CartApiClient(this.apiUrl, token)
    const { ok, data, status } = await cart.addItem(productId, quantity)
    if (!ok) {
      throw new Error(`Failed to seed cart (${status}): ${JSON.stringify(data)}`)
    }
  }

  /**
   * Removes all items from the given user's cart via API.
   * Called in afterEach hooks to ensure tests don't affect each other's cart state.
   */
  async clearCart(token: string): Promise<void> {
    const cart = new CartApiClient(this.apiUrl, token)
    await cart.clearCart()
  }
}
