import { Page, Locator } from '@playwright/test'
import { BasePage } from './BasePage'

export class ProductDetailPage extends BasePage {
  async goto(productId: number): Promise<void> {
    await this.page.goto(`/products/${productId}`)
    await this.waitForPageLoad()
  }

  get productName(): Locator {
    return this.page.getByRole('heading', { level: 1 })
  }

  get productPrice(): Locator {
    return this.page.locator('div[class*="text-3xl"][class*="font-bold"]')
  }

  get stockStatus(): Locator {
    return this.page.locator('[class*="text-green-600"], [class*="text-red-500"]').first()
  }

  get quantityDecrease(): Locator {
    return this.page.locator('div[class*="border-gray-300"][class*="rounded-lg"]').getByRole('button', { name: '−' })
  }

  get quantityDisplay(): Locator {
    return this.page.locator('div[class*="border-gray-300"][class*="rounded-lg"] span')
  }

  get quantityIncrease(): Locator {
    return this.page.locator('div[class*="border-gray-300"][class*="rounded-lg"]').getByRole('button', { name: '+' })
  }

  get addToCartButton(): Locator {
    return this.page.getByRole('button', { name: 'Add to Cart' })
  }

  get outOfStockButton(): Locator {
    return this.page.getByRole('button', { name: 'Out of Stock' })
  }

  get backToProductsLink(): Locator {
    return this.page.getByRole('link', { name: '← Back to Products' })
  }

  async increaseQuantity(times: number = 1): Promise<void> {
    for (let i = 0; i < times; i++) {
      await this.quantityIncrease.click()
    }
  }

  async decreaseQuantity(times: number = 1): Promise<void> {
    for (let i = 0; i < times; i++) {
      await this.quantityDecrease.click()
    }
  }

  async getQuantity(): Promise<number> {
    const text = await this.quantityDisplay.textContent()
    return parseInt(text || '1', 10)
  }

  async addToCart(): Promise<void> {
    await this.addToCartButton.click()
  }

  async isInStock(): Promise<boolean> {
    return this.addToCartButton.isVisible()
  }
}
