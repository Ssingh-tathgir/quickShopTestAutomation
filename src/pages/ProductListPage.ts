/**
 * Page Object for the Product List page (/) — the home / catalog page.
 *
 * Displays a grid of ProductCard components, each showing a product image,
 * name, price, an "Add to Cart" button, and (for authenticated users) a
 * wishlist heart button.
 *
 * Key interactions:
 *   - Add any specific product to cart by name
 *   - Add the first available in-stock product to cart (for tests that don't
 *     care which product they use)
 *   - Navigate to a product's detail page
 *
 * Selector strategy:
 *   The product cards don't have data-testid attributes (not yet added to the
 *   source). Cards are identified by their Tailwind class signature
 *   (rounded-xl shadow-sm border-gray-100) and then filtered by visible text.
 */
import { Page, Locator } from '@playwright/test'
import { BasePage } from './BasePage'

export class ProductListPage extends BasePage {
  /** Navigates to the home page (product catalog) and waits for DOM ready. */
  async goto(): Promise<void> {
    await this.page.goto('/')
    await this.waitForPageLoad()
  }

  // ── Locators ──────────────────────────────────────────────────────────────

  /**
   * Returns the card element for a specific product by its visible name.
   * Uses Tailwind class matching to identify card containers, then filters
   * to the one whose text includes the product name.
   */
  productCard(productName: string): Locator {
    return this.page.locator('div[class*="rounded-xl"][class*="shadow-sm"]').filter({ hasText: productName })
  }

  /**
   * All product cards on the page — used to iterate and find the first
   * one with an "Add to Cart" button (in-stock products only).
   */
  get allProductCards(): Locator {
    return this.page.locator('div[class*="rounded-xl"][class*="shadow-sm"][class*="border-gray-100"]')
  }

  /** The "Add to Cart" button within a specific product's card. */
  addToCartButton(productName: string): Locator {
    return this.productCard(productName).getByRole('button', { name: 'Add to Cart' })
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  /** Clicks "Add to Cart" for a product identified by name. */
  async clickAddToCart(productName: string): Promise<void> {
    await this.addToCartButton(productName).click()
  }

  /**
   * Finds the first product card that has an "Add to Cart" button (i.e. is in stock),
   * clicks it, and returns the product name.
   *
   * Why iterate rather than just click the first button on the page?
   * Out-of-stock products show an "Out of Stock" label instead of the button,
   * so we must skip them to avoid a test failure on pages with mixed stock.
   */
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

  /** Clicks the product name link to navigate to its detail page. */
  async navigateToProduct(productName: string): Promise<void> {
    await this.productCard(productName).getByRole('link', { name: productName }).click()
  }

  /** Clicks the image link of the first product card to open its detail page. */
  async navigateToFirstProduct(): Promise<void> {
    await this.allProductCards.first().getByRole('link').first().click()
  }

  /**
   * The wishlist heart icon button for a specific product.
   * Only visible when the user is authenticated.
   */
  wishlistButton(productName: string): Locator {
    return this.productCard(productName).getByTitle(/Wishlist/)
  }
}
