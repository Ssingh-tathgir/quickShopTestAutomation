/**
 * BasePage — shared foundation for all Page Object Model (POM) classes.
 *
 * Every page class in this framework extends BasePage. It provides:
 *   - Common navigation and wait helpers
 *   - Navbar element locators (cart count badge, nav links)
 *   - Toast notification helpers used across multiple pages
 *
 * The Page Object Model pattern keeps UI interaction code in one place.
 * Test files import page objects and call their methods — they never
 * write raw Playwright locators or selectors directly.
 */
import { Page, Locator } from '@playwright/test'

export class BasePage {
  /**
   * @param page  The Playwright Page object injected by a fixture or Cucumber world.
   *              Marked protected so subclasses can access this.page directly.
   */
  constructor(protected readonly page: Page) {}

  /** Navigates to an arbitrary path relative to BASE_URL. */
  async goto(path: string): Promise<void> {
    await this.page.goto(path)
  }

  /** Waits until the DOM is parsed and the page is interactive. */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded')
  }

  // ── Navbar helpers ────────────────────────────────────────────────────────

  /** Returns any navigation link by its visible text label. */
  navLink(name: string): Locator {
    return this.page.locator('nav').getByRole('link', { name })
  }

  /** The Cart link in the top navigation bar. */
  get cartNavLink(): Locator {
    return this.page.locator('nav').getByRole('link', { name: /^Cart/ })
  }

  /**
   * The red badge showing the number of items in the cart.
   * Rendered as a <span> inside the Cart <a> tag — only visible when cart > 0.
   */
  get cartCountBadge(): Locator {
    return this.page.locator('nav a[href="/cart"] span')
  }

  /**
   * Reads the current cart count from the navbar badge.
   * Returns 0 if the badge is not visible (empty cart).
   */
  async getCartCount(): Promise<number> {
    const badge = this.cartCountBadge
    if (!(await badge.isVisible())) return 0
    const text = await badge.textContent()
    return parseInt(text || '0', 10)
  }

  // ── Toast notification helpers ────────────────────────────────────────────

  /**
   * Locates the toast notification element.
   * The toast is a fixed-position div in the top-right corner rendered by
   * the Toast component (components/Toast.tsx). It auto-dismisses after 3.5s.
   * CSS classes: fixed top-5 right-5 z-50
   */
  get toast(): Locator {
    return this.page.locator('div.fixed.top-5')
  }

  /**
   * Waits for the toast to appear and returns its full text content.
   * Times out after 5 seconds if no toast appears (test will fail).
   */
  async getToastMessage(): Promise<string> {
    await this.toast.waitFor({ state: 'visible', timeout: 5000 })
    return (await this.toast.textContent()) || ''
  }

  /** Alias for getToastMessage() — reads more naturally in some test contexts. */
  async waitForToast(): Promise<string> {
    return this.getToastMessage()
  }
}
