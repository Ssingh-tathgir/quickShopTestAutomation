import { test as base, Page } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'
import { CartPage } from '../pages/CartPage'
import { ProductListPage } from '../pages/ProductListPage'
import { ProductDetailPage } from '../pages/ProductDetailPage'
import { TestDataFactory, TestUser } from '../utils/TestDataFactory'
import { CartApiClient } from '../api/CartApiClient'
import { Product } from '../api/ProductApiClient'
import { ENV } from '../config/env'

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
  testUser: async ({}, use) => {
    const factory = new TestDataFactory(ENV.API_URL)
    const user = await factory.createTestUser()
    await use(user)
  },

  authenticatedPage: async ({ page, testUser }, use) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.loginAndWait(testUser.email, testUser.password)
    await use(page)
  },

  loginPage: async ({ page }, use) => {
    const lp = new LoginPage(page)
    await lp.goto()
    await use(lp)
  },

  cartPage: async ({ authenticatedPage }, use) => {
    const cp = new CartPage(authenticatedPage)
    await use(cp)
  },

  productListPage: async ({ authenticatedPage }, use) => {
    await authenticatedPage.goto('/')
    const plp = new ProductListPage(authenticatedPage)
    await use(plp)
  },

  productDetailPage: async ({ authenticatedPage }, use) => {
    const pdp = new ProductDetailPage(authenticatedPage)
    await use(pdp)
  },

  seededCartProduct: async ({ testUser }, use) => {
    const factory = new TestDataFactory(ENV.API_URL)
    const product = await factory.getFirstInStockProduct()
    await factory.seedCart(testUser.token, product.id, 1)
    await use(product)
    // cleanup: remove added items after test
    const cart = new CartApiClient(ENV.API_URL, testUser.token)
    await cart.clearCart().catch(() => {})
  },
})

export { expect } from '@playwright/test'
