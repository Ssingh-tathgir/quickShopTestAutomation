import { Page, Locator } from '@playwright/test'
import { BasePage } from './BasePage'

export class CartPage extends BasePage {
  async goto(): Promise<void> {
    await this.page.goto('/cart')
    await this.waitForPageLoad()
  }

  get heading(): Locator {
    return this.page.getByRole('heading', { name: 'Shopping Cart' })
  }

  get emptyStateMessage(): Locator {
    return this.page.getByText('Your cart is empty')
  }

  get continueShoppingLink(): Locator {
    return this.page.getByRole('link', { name: 'Continue Shopping' }).first()
  }

  get proceedToCheckoutLink(): Locator {
    return this.page.getByRole('link', { name: 'Proceed to Checkout' })
  }

  get orderSummaryHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Order Summary' })
  }

  get subtotalText(): Locator {
    return this.page.locator('text=Total').locator('..').getByText(/\$[\d.]+/).last()
  }

  get itemCountText(): Locator {
    return this.page.locator('text=/Items \\(\\d+\\)/')
  }

  get allCartItems(): Locator {
    return this.page.locator('div[class*="bg-white"][class*="rounded-xl"][class*="border-gray-100"][class*="p-4"]')
  }

  cartItem(productName: string): Locator {
    return this.allCartItems.filter({ hasText: productName })
  }

  decreaseButton(productName: string): Locator {
    return this.cartItem(productName).getByRole('button', { name: '−' })
  }

  increaseButton(productName: string): Locator {
    return this.cartItem(productName).getByRole('button', { name: '+' })
  }

  quantityDisplay(productName: string): Locator {
    return this.cartItem(productName).locator('span[class*="text-sm"][class*="font-medium"][class*="w-6"]')
  }

  lineTotal(productName: string): Locator {
    return this.cartItem(productName).locator('p[class*="font-bold"]')
  }

  removeButton(productName: string): Locator {
    return this.cartItem(productName).getByRole('button', { name: 'Remove' })
  }

  async getQuantity(productName: string): Promise<number> {
    const text = await this.quantityDisplay(productName).textContent()
    return parseInt(text || '0', 10)
  }

  async getLineTotal(productName: string): Promise<number> {
    const text = await this.lineTotal(productName).textContent()
    return parseFloat((text || '0').replace('$', ''))
  }

  async getSubtotal(): Promise<number> {
    const totalRow = this.page.locator('div[class*="flex"][class*="justify-between"][class*="font-bold"]')
    const text = await totalRow.locator('span').last().textContent()
    return parseFloat((text || '0').replace('$', ''))
  }

  async getItemCount(): Promise<number> {
    const text = await this.itemCountText.textContent()
    const match = text?.match(/\((\d+)\)/)
    return match ? parseInt(match[1], 10) : 0
  }

  async getCartItemCount(): Promise<number> {
    return this.allCartItems.count()
  }

  async increaseQuantity(productName: string): Promise<void> {
    await this.increaseButton(productName).click()
    await this.page.waitForLoadState('networkidle')
  }

  async decreaseQuantity(productName: string): Promise<void> {
    await this.decreaseButton(productName).click()
    await this.page.waitForLoadState('networkidle')
  }

  async removeItem(productName: string): Promise<void> {
    await this.removeButton(productName).click()
    await this.page.waitForLoadState('networkidle')
  }

  async proceedToCheckout(): Promise<void> {
    await this.proceedToCheckoutLink.click()
  }

  async continueShopping(): Promise<void> {
    await this.continueShoppingLink.click()
  }

  async isItemVisible(productName: string): Promise<boolean> {
    return this.cartItem(productName).isVisible()
  }

  async isEmpty(): Promise<boolean> {
    return this.emptyStateMessage.isVisible()
  }

  async isDecreaseButtonDisabled(productName: string): Promise<boolean> {
    return this.decreaseButton(productName).isDisabled()
  }

  async isIncreaseButtonDisabled(productName: string): Promise<boolean> {
    return this.increaseButton(productName).isDisabled()
  }
}
