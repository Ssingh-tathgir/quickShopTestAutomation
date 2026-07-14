/**
 * Page Object for the Cart page (/cart).
 *
 * The cart page has two distinct states:
 *   1. Empty — shows "Your cart is empty" and a Continue Shopping link
 *   2. With items — shows a list of cart items and an Order Summary panel
 *
 * Cart item layout (per item):
 *   [ Product image ] [ Name | Price each | Qty stepper ] [ Line total | Remove ]
 *
 * Order Summary panel (right column on desktop):
 *   Items (N)  $subtotal
 *   ──────────────────
 *   Total      $subtotal
 *   [Proceed to Checkout]
 *   [Continue Shopping]
 *
 * Selector strategy:
 *   Cart items have no data-testid. They are identified by their Tailwind card
 *   class signature and then filtered by the product name text. All per-item
 *   interactions (quantity buttons, Remove button) are scoped within the matching
 *   cart item container to avoid ambiguity when there are multiple items.
 *
 *   After quantity changes and removals, waitForLoadState('networkidle') is called
 *   to ensure the React state update and re-render have completed before assertions.
 */
import { Page, Locator } from '@playwright/test'
import { BasePage } from './BasePage'

export class CartPage extends BasePage {
  /** Navigates to /cart and waits for DOM to be ready. */
  async goto(): Promise<void> {
    await this.page.goto('/cart')
    await this.waitForPageLoad()
  }

  // ── Page-level elements ───────────────────────────────────────────────────

  /** The main "Shopping Cart" page heading — confirms we're on the cart page. */
  get heading(): Locator {
    return this.page.getByRole('heading', { name: 'Shopping Cart' })
  }

  /** Empty-state message shown when the cart has no items. */
  get emptyStateMessage(): Locator {
    return this.page.getByText('Your cart is empty')
  }

  /**
   * "Continue Shopping" link — appears both in the empty state and below the
   * checkout button. .first() selects the empty-state link when both are present.
   */
  get continueShoppingLink(): Locator {
    return this.page.getByRole('link', { name: 'Continue Shopping' }).first()
  }

  /** "Proceed to Checkout" link in the Order Summary panel — navigates to /checkout. */
  get proceedToCheckoutLink(): Locator {
    return this.page.getByRole('link', { name: 'Proceed to Checkout' })
  }

  /** "Order Summary" heading in the right-hand summary panel. */
  get orderSummaryHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Order Summary' })
  }

  /**
   * The "Items (N)" text in the summary panel, where N is the total unit count.
   * Used with a regex so it matches any number of items.
   */
  get itemCountText(): Locator {
    return this.page.locator('text=/Items \\(\\d+\\)/')
  }

  // ── Cart item collection ──────────────────────────────────────────────────

  /**
   * All cart item cards. Identified by Tailwind classes:
   *   bg-white rounded-xl border-gray-100 p-4
   * Each card contains the product image, name, quantity controls, and Remove button.
   */
  get allCartItems(): Locator {
    return this.page.locator('div[class*="bg-white"][class*="rounded-xl"][class*="border-gray-100"][class*="p-4"]')
  }

  /**
   * A specific cart item card filtered by product name text.
   * All per-item locators (quantity, remove, line total) are scoped within this.
   */
  cartItem(productName: string): Locator {
    return this.allCartItems.filter({ hasText: productName })
  }

  // ── Per-item controls (scoped to a specific product) ──────────────────────

  /** The minus (−) button inside a product's cart row. Disabled when quantity is 1. */
  decreaseButton(productName: string): Locator {
    return this.cartItem(productName).getByRole('button', { name: '−' })
  }

  /** The plus (+) button inside a product's cart row. Disabled when quantity equals stock. */
  increaseButton(productName: string): Locator {
    return this.cartItem(productName).getByRole('button', { name: '+' })
  }

  /**
   * The span displaying the current quantity for a product.
   * Scoped to the cart item and identified by its Tailwind size/alignment classes.
   */
  quantityDisplay(productName: string): Locator {
    return this.cartItem(productName).locator('span[class*="text-sm"][class*="font-medium"][class*="w-6"]')
  }

  /**
   * The bold price element showing the line total (price × quantity) for a product.
   * This updates immediately after quantity changes.
   */
  lineTotal(productName: string): Locator {
    return this.cartItem(productName).locator('p[class*="font-bold"]')
  }

  /** The "Remove" text button that deletes the entire item from the cart. */
  removeButton(productName: string): Locator {
    return this.cartItem(productName).getByRole('button', { name: 'Remove' })
  }

  // ── Data extraction ───────────────────────────────────────────────────────

  /** Returns the current quantity displayed for a product as a number. */
  async getQuantity(productName: string): Promise<number> {
    const text = await this.quantityDisplay(productName).textContent()
    return parseInt(text || '0', 10)
  }

  /** Returns the line total (e.g. "$29.99") for a product as a float. */
  async getLineTotal(productName: string): Promise<number> {
    const text = await this.lineTotal(productName).textContent()
    return parseFloat((text || '0').replace('$', ''))
  }

  /**
   * Returns the cart total displayed in the Order Summary panel.
   * Reads the last bold "Total" row — the first is "Items (N)" and the last is "Total".
   */
  async getSubtotal(): Promise<number> {
    const totalRow = this.page.locator('div[class*="flex"][class*="justify-between"][class*="font-bold"]')
    const text = await totalRow.locator('span').last().textContent()
    return parseFloat((text || '0').replace('$', ''))
  }

  /**
   * Returns the item count shown in the summary panel — e.g. "Items (3)" → 3.
   * This is total units, not unique products.
   */
  async getItemCount(): Promise<number> {
    const text = await this.itemCountText.textContent()
    const match = text?.match(/\((\d+)\)/)
    return match ? parseInt(match[1], 10) : 0
  }

  /** Returns the number of distinct product rows currently visible in the cart. */
  async getCartItemCount(): Promise<number> {
    return this.allCartItems.count()
  }

  // ── Interaction methods ───────────────────────────────────────────────────

  /**
   * Clicks the + button for a product and waits for the network to settle.
   * networkidle ensures React has received the API response and re-rendered
   * before the test reads quantity or subtotal values.
   */
  async increaseQuantity(productName: string): Promise<void> {
    await this.increaseButton(productName).click()
    await this.page.waitForLoadState('networkidle')
  }

  /** Clicks the − button for a product and waits for re-render. */
  async decreaseQuantity(productName: string): Promise<void> {
    await this.decreaseButton(productName).click()
    await this.page.waitForLoadState('networkidle')
  }

  /** Clicks the Remove button and waits for the item to disappear from the DOM. */
  async removeItem(productName: string): Promise<void> {
    await this.removeButton(productName).click()
    await this.page.waitForLoadState('networkidle')
  }

  /** Clicks "Proceed to Checkout" — navigates to /checkout. */
  async proceedToCheckout(): Promise<void> {
    await this.proceedToCheckoutLink.click()
  }

  /** Clicks "Continue Shopping" — navigates back to the home page. */
  async continueShopping(): Promise<void> {
    await this.continueShoppingLink.click()
  }

  // ── State checks ──────────────────────────────────────────────────────────

  /** Returns true if the named product's card is currently visible in the cart. */
  async isItemVisible(productName: string): Promise<boolean> {
    return this.cartItem(productName).isVisible()
  }

  /** Returns true if the cart is in its empty state (no items). */
  async isEmpty(): Promise<boolean> {
    return this.emptyStateMessage.isVisible()
  }

  /** Returns true if the − button is disabled (quantity is at the minimum of 1). */
  async isDecreaseButtonDisabled(productName: string): Promise<boolean> {
    return this.decreaseButton(productName).isDisabled()
  }

  /** Returns true if the + button is disabled (quantity has reached the product's stock limit). */
  async isIncreaseButtonDisabled(productName: string): Promise<boolean> {
    return this.increaseButton(productName).isDisabled()
  }
}
