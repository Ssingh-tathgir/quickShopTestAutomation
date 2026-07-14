import { Page, Locator } from '@playwright/test'
import { BasePage } from './BasePage'

export class ProductListPage extends BasePage {
  async goto(): Promise<void> {
    await this.page.goto('/')
    await this.waitForPageLoad()
  }

  productCard(productName: string): Locator {
    return this.page.locator('div[class*="rounded-xl"][class*="shadow-sm"]').filter({ hasText: productName })
  }

  get allProductCards(): Locator {
    return this.page.locator('div[class*="rounded-xl"][class*="shadow-sm"][class*="border-gray-100"]')
  }

  addToCartButton(productName: string): Locator {
    return this.productCard(productName).getByRole('button', { name: 'Add to Cart' })
  }

  async clickAddToCart(productName: string): Promise<void> {
    await this.addToCartButton(productName).click()
  }

  async clickFirstAddToCart(): Promise<string> {
    const cards = this.allProductCards
    const count = await cards.count()
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i)
      const btn = card.getByRole('button', { name: 'Add to Cart' })
      if (await btn.isVisible()) {
        const nameEl = card.getByRole('link').first()
        const name = (await nameEl.textContent()) || ''
        await btn.click()
        return name.trim()
      }
    }
    throw new Error('No "Add to Cart" button found on product list page')
  }

  async navigateToProduct(productName: string): Promise<void> {
    await this.productCard(productName).getByRole('link', { name: productName }).click()
  }

  async navigateToFirstProduct(): Promise<void> {
    await this.allProductCards.first().getByRole('link').first().click()
  }

  wishlistButton(productName: string): Locator {
    return this.productCard(productName).getByTitle(/Wishlist/)
  }
}
