import { AuthApiClient } from '../api/AuthApiClient'
import { CartApiClient } from '../api/CartApiClient'
import { ProductApiClient, Product } from '../api/ProductApiClient'
import { ENV } from '../config/env'

export interface TestUser {
  firstName: string
  lastName: string
  email: string
  password: string
  token: string
}

export class TestDataFactory {
  private readonly auth: AuthApiClient
  private readonly products: ProductApiClient

  constructor(private readonly apiUrl: string = ENV.API_URL) {
    this.auth = new AuthApiClient(apiUrl)
    this.products = new ProductApiClient(apiUrl)
  }

  async createTestUser(): Promise<TestUser> {
    const ts = Date.now()
    const user = {
      firstName: 'Test',
      lastName: `User${ts}`,
      email: `test.user.${ts}@quickshop.test`,
      password: ENV.TEST_USER_PASSWORD,
    }

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

    const { ok: loginOk, data: loginData, status: loginStatus } = await this.auth.login(
      user.email,
      user.password,
    )

    if (!loginOk) {
      throw new Error(`Failed to login test user (${loginStatus}): ${JSON.stringify(loginData)}`)
    }

    return { ...user, token: loginData.access_token }
  }

  async loginExistingUser(email: string, password: string): Promise<string> {
    const { ok, data, status } = await this.auth.login(email, password)
    if (!ok) throw new Error(`Login failed (${status}): ${JSON.stringify(data)}`)
    return data.access_token
  }

  async getFirstInStockProduct(): Promise<Product> {
    return this.products.getFirstInStockProduct()
  }

  async getProductWithStock(minStock: number = 2): Promise<Product> {
    return this.products.getProductWithStock(minStock)
  }

  async seedCart(token: string, productId: number, quantity: number = 1): Promise<void> {
    const cart = new CartApiClient(this.apiUrl, token)
    const { ok, data, status } = await cart.addItem(productId, quantity)
    if (!ok) {
      throw new Error(`Failed to seed cart (${status}): ${JSON.stringify(data)}`)
    }
  }

  async clearCart(token: string): Promise<void> {
    const cart = new CartApiClient(this.apiUrl, token)
    await cart.clearCart()
  }
}
