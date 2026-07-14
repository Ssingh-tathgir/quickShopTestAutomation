import { Page, Locator } from '@playwright/test'

export class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(path: string): Promise<void> {
    await this.page.goto(path)
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded')
  }

  navLink(name: string): Locator {
    return this.page.locator('nav').getByRole('link', { name })
  }

  get cartNavLink(): Locator {
    return this.page.locator('nav').getByRole('link', { name: /^Cart/ })
  }

  get cartCountBadge(): Locator {
    return this.page.locator('nav a[href="/cart"] span')
  }

  async getCartCount(): Promise<number> {
    const badge = this.cartCountBadge
    if (!(await badge.isVisible())) return 0
    const text = await badge.textContent()
    return parseInt(text || '0', 10)
  }

  get toast(): Locator {
    return this.page.locator('div.fixed.top-5')
  }

  async getToastMessage(): Promise<string> {
    await this.toast.waitFor({ state: 'visible', timeout: 5000 })
    return (await this.toast.textContent()) || ''
  }

  async waitForToast(): Promise<string> {
    return this.getToastMessage()
  }
}
