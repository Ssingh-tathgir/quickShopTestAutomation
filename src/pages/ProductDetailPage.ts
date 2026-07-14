/**
 * Page Object for the Product Detail page (/products/{id}).
 *
 * Shows a single product's full details: image, name, description, price,
 * stock status, a quantity selector, and an "Add to Cart" button.
 *
 * Key interactions:
 *   - Read product name, price, and stock status
 *   - Use the quantity stepper (−/+) to select how many units to add
 *   - Click "Add to Cart" and verify the success toast
 *
 * Selector strategy:
 *   - Product name: h1 heading (only one on the page)
 *   - Price: div with text-3xl font-bold classes (large price display)
 *   - Quantity stepper: scoped to the stepper container to avoid
 *     conflicting with the navbar or other +/− buttons
 *   - Stock status: green text (in stock) or red text (out of stock)
 */
import { Page, Locator } from '@playwright/test'
import { BasePage } from './BasePage'

export class ProductDetailPage extends BasePage {
  /**
   * Navigates to the detail page for the given product ID.
   * Product IDs are obtained from the API via TestDataFactory rather than
   * being hard-coded, so tests remain valid across different environments.
   */
  async goto(productId: number): Promise<void> {
    await this.page.goto(`/products/${productId}`)
    await this.waitForPageLoad()
  }

  // ── Product information ───────────────────────────────────────────────────

  /** The product name displayed as the main h1 heading. */
  get productName(): Locator {
    return this.page.getByRole('heading', { level: 1 })
  }

  /** The large price display (e.g. "$29.99"). */
  get productPrice(): Locator {
    return this.page.locator('div[class*="text-3xl"][class*="font-bold"]')
  }

  /**
   * The stock status label — green ("In Stock: N units") or red ("Out of Stock").
   * first() is used because theoretically there could be multiple coloured
   * elements, but the stock label is always the first such element in the section.
   */
  get stockStatus(): Locator {
    return this.page.locator('[class*="text-green-600"], [class*="text-red-500"]').first()
  }

  // ── Quantity stepper ──────────────────────────────────────────────────────

  /**
   * The minus (−) button in the quantity stepper.
   * Scoped within the stepper container (border-gray-300 rounded-lg) to avoid
   * matching other buttons. Disabled when quantity is already at 1.
   */
  get quantityDecrease(): Locator {
    return this.page.locator('div[class*="border-gray-300"][class*="rounded-lg"]').getByRole('button', { name: '−' })
  }

  /** The span showing the current selected quantity number. */
  get quantityDisplay(): Locator {
    return this.page.locator('div[class*="border-gray-300"][class*="rounded-lg"] span')
  }

  /**
   * The plus (+) button in the quantity stepper.
   * Disabled when quantity equals the product's available stock.
   */
  get quantityIncrease(): Locator {
    return this.page.locator('div[class*="border-gray-300"][class*="rounded-lg"]').getByRole('button', { name: '+' })
  }

  // ── Cart actions ──────────────────────────────────────────────────────────

  /**
   * The blue "Add to Cart" button — only visible when the product is in stock.
   * Clicking this adds the currently selected quantity to the cart.
   */
  get addToCartButton(): Locator {
    return this.page.getByRole('button', { name: 'Add to Cart' })
  }

  /**
   * The disabled "Out of Stock" button shown when stock is 0.
   * Verifying this is visible confirms the product is unavailable.
   */
  get outOfStockButton(): Locator {
    return this.page.getByRole('button', { name: 'Out of Stock' })
  }

  /** Back navigation link to return to the product catalog. */
  get backToProductsLink(): Locator {
    return this.page.getByRole('link', { name: '← Back to Products' })
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Clicks the increase (+) button `times` times.
   * Each click increments the quantity by 1 (server-side max is product.stock).
   */
  async increaseQuantity(times: number = 1): Promise<void> {
    for (let i = 0; i < times; i++) {
      await this.quantityIncrease.click()
    }
  }

  /** Clicks the decrease (−) button `times` times. Stops at 1 (button becomes disabled). */
  async decreaseQuantity(times: number = 1): Promise<void> {
    for (let i = 0; i < times; i++) {
      await this.quantityDecrease.click()
    }
  }

  /** Returns the currently displayed quantity as a number. */
  async getQuantity(): Promise<number> {
    const text = await this.quantityDisplay.textContent()
    return parseInt(text || '1', 10)
  }

  /** Clicks "Add to Cart" with the currently selected quantity. */
  async addToCart(): Promise<void> {
    await this.addToCartButton.click()
  }

  /** Returns true if the product is in stock (i.e. the Add to Cart button is visible). */
  async isInStock(): Promise<boolean> {
    return this.addToCartButton.isVisible()
  }
}
