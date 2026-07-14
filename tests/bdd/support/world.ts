import { setWorldConstructor, World, IWorldOptions, Before, After, BeforeAll, AfterAll } from '@cucumber/cucumber'
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
  browser!: Browser
  context!: BrowserContext
  page!: Page

  testUser?: TestUser
  seededProduct?: Product

  loginPage!: LoginPage
  cartPage!: CartPage
  productListPage!: ProductListPage
  productDetailPage!: ProductDetailPage

  constructor(options: IWorldOptions) {
    super(options)
  }

  async initPages(): Promise<void> {
    this.loginPage = new LoginPage(this.page)
    this.cartPage = new CartPage(this.page)
    this.productListPage = new ProductListPage(this.page)
    this.productDetailPage = new ProductDetailPage(this.page)
  }
}

setWorldConstructor(QuickShopWorld)

Before(async function (this: QuickShopWorld) {
  this.browser = await chromium.launch({ headless: true })
  this.context = await this.browser.newContext({ baseURL: ENV.BASE_URL })
  this.page = await this.context.newPage()
  await this.initPages()
})

After(async function (this: QuickShopWorld) {
  if (this.testUser && this.seededProduct) {
    try {
      const cart = new CartApiClient(ENV.API_URL, this.testUser.token)
      await cart.clearCart()
    } catch {
      // best-effort cleanup
    }
  }
  await this.page?.close()
  await this.context?.close()
  await this.browser?.close()
})
