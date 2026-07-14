import { test, expect } from '../../src/fixtures/fixtures'
import { LoginPage } from '../../src/pages/LoginPage'
import { CartPage } from '../../src/pages/CartPage'
import { ProductListPage } from '../../src/pages/ProductListPage'

test.describe('Cart — Unauthenticated access', () => {
  test('redirects unauthenticated user to login when navigating to /cart', async ({ page }) => {
    await page.goto('/cart')
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})

test.describe('Cart — Empty state', () => {
  test('shows empty cart message for a new user', async ({ cartPage }) => {
    await cartPage.goto()
    await expect(cartPage.heading).toBeVisible()
    await expect(cartPage.emptyStateMessage).toBeVisible()
    await expect(cartPage.continueShoppingLink).toBeVisible()
  })

  test('Continue Shopping link navigates to product list', async ({ cartPage }) => {
    await cartPage.goto()
    await cartPage.continueShopping()
    await expect(cartPage.page).toHaveURL('/')
  })
})

test.describe('Cart — Add to cart', () => {
  test('adds product from product list page and shows success toast', async ({ productListPage }) => {
    const productName = await productListPage.clickFirstAddToCart()
    const toast = await productListPage.getToastMessage()
    expect(toast).toContain('added to cart')
    expect(toast).toContain(productName.slice(0, 10))
  })

  test('cart count badge updates after adding from product list', async ({ productListPage }) => {
    const countBefore = await productListPage.getCartCount()
    await productListPage.clickFirstAddToCart()
    await productListPage.page.waitForFunction(
      (before) => {
        const badge = document.querySelector('nav a[href="/cart"] span')
        if (!badge) return before === 0 ? false : true
        return parseInt(badge.textContent || '0') > before
      },
      countBefore,
      { timeout: 5000 },
    )
    const countAfter = await productListPage.getCartCount()
    expect(countAfter).toBeGreaterThan(countBefore)
  })

  test('adds product from product detail page and shows success toast', async ({ productDetailPage, testUser }) => {
    const { ProductApiClient } = await import('../../src/api/ProductApiClient')
    const { ENV } = await import('../../src/config/env')
    const productClient = new ProductApiClient(ENV.API_URL)
    const product = await productClient.getFirstInStockProduct()

    await productDetailPage.goto(product.id)
    await expect(productDetailPage.addToCartButton).toBeVisible()
    await productDetailPage.addToCart()

    const toast = await productDetailPage.getToastMessage()
    expect(toast).toContain('added to cart')
  })

  test('quantity selector on product detail page defaults to 1', async ({ productDetailPage }) => {
    const { ProductApiClient } = await import('../../src/api/ProductApiClient')
    const { ENV } = await import('../../src/config/env')
    const product = await new ProductApiClient(ENV.API_URL).getFirstInStockProduct()

    await productDetailPage.goto(product.id)
    expect(await productDetailPage.getQuantity()).toBe(1)
  })

  test('quantity selector on product detail page can be increased', async ({ productDetailPage }) => {
    const { ProductApiClient } = await import('../../src/api/ProductApiClient')
    const { ENV } = await import('../../src/config/env')
    const product = await new ProductApiClient(ENV.API_URL).getProductWithStock(2)

    await productDetailPage.goto(product.id)
    await productDetailPage.increaseQuantity()
    expect(await productDetailPage.getQuantity()).toBe(2)
  })
})

test.describe('Cart — View items', () => {
  test('shows added item with name, price, quantity and line total', async ({
    cartPage,
    seededCartProduct,
  }) => {
    await cartPage.goto()
    await expect(cartPage.heading).toBeVisible()
    await expect(cartPage.cartItem(seededCartProduct.name)).toBeVisible()

    const qty = await cartPage.getQuantity(seededCartProduct.name)
    expect(qty).toBe(1)

    const lineTotal = await cartPage.getLineTotal(seededCartProduct.name)
    expect(lineTotal).toBeCloseTo(seededCartProduct.price, 2)
  })

  test('shows Order Summary with correct item count and subtotal', async ({
    cartPage,
    seededCartProduct,
  }) => {
    await cartPage.goto()
    await expect(cartPage.orderSummaryHeading).toBeVisible()

    const itemCount = await cartPage.getItemCount()
    expect(itemCount).toBe(1)

    const subtotal = await cartPage.getSubtotal()
    expect(subtotal).toBeCloseTo(seededCartProduct.price, 2)
  })

  test('Proceed to Checkout button is visible with items in cart', async ({
    cartPage,
    seededCartProduct: _,
  }) => {
    await cartPage.goto()
    await expect(cartPage.proceedToCheckoutLink).toBeVisible()
  })
})

test.describe('Cart — Quantity management', () => {
  test('increases item quantity and updates line total', async ({
    cartPage,
    seededCartProduct,
    testUser,
  }) => {
    const { ProductApiClient } = await import('../../src/api/ProductApiClient')
    const { ENV } = await import('../../src/config/env')
    const product = await new ProductApiClient(ENV.API_URL).getProductWithStock(2)

    if (product.id !== seededCartProduct.id) {
      const { CartApiClient } = await import('../../src/api/CartApiClient')
      const cart = new CartApiClient(ENV.API_URL, testUser.token)
      await cart.clearCart()
      await cart.addItem(product.id, 1)
    }

    await cartPage.goto()
    await cartPage.increaseQuantity(product.name)

    const qty = await cartPage.getQuantity(product.name)
    expect(qty).toBe(2)

    const lineTotal = await cartPage.getLineTotal(product.name)
    expect(lineTotal).toBeCloseTo(product.price * 2, 2)
  })

  test('decrease button is disabled when quantity is 1', async ({
    cartPage,
    seededCartProduct,
  }) => {
    await cartPage.goto()
    const qty = await cartPage.getQuantity(seededCartProduct.name)
    expect(qty).toBe(1)
    expect(await cartPage.isDecreaseButtonDisabled(seededCartProduct.name)).toBe(true)
  })

  test('decreases item quantity', async ({
    cartPage,
    seededCartProduct,
    testUser,
  }) => {
    const { CartApiClient } = await import('../../src/api/CartApiClient')
    const { ENV } = await import('../../src/config/env')
    const cart = new CartApiClient(ENV.API_URL, testUser.token)
    await cart.updateItem(seededCartProduct.id, 2)

    await cartPage.goto()
    const qtyBefore = await cartPage.getQuantity(seededCartProduct.name)
    expect(qtyBefore).toBe(2)

    await cartPage.decreaseQuantity(seededCartProduct.name)
    const qtyAfter = await cartPage.getQuantity(seededCartProduct.name)
    expect(qtyAfter).toBe(1)
  })
})

test.describe('Cart — Remove item', () => {
  test('removes item and shows empty state when cart becomes empty', async ({
    cartPage,
    seededCartProduct,
  }) => {
    await cartPage.goto()
    await expect(cartPage.cartItem(seededCartProduct.name)).toBeVisible()

    await cartPage.removeItem(seededCartProduct.name)

    await expect(cartPage.emptyStateMessage).toBeVisible()
  })

  test('removes one item when cart has multiple items', async ({
    cartPage,
    seededCartProduct,
    testUser,
  }) => {
    const { TestDataFactory } = await import('../../src/utils/TestDataFactory')
    const { ENV } = await import('../../src/config/env')
    const factory = new TestDataFactory(ENV.API_URL)
    const secondProduct = await factory.getProductWithStock()

    if (secondProduct.id !== seededCartProduct.id) {
      await factory.seedCart(testUser.token, secondProduct.id, 1)
    }

    await cartPage.goto()
    const totalBefore = await cartPage.getCartItemCount()

    await cartPage.removeItem(seededCartProduct.name)

    const totalAfter = await cartPage.getCartItemCount()
    expect(totalAfter).toBe(totalBefore - 1)
    expect(await cartPage.isItemVisible(seededCartProduct.name)).toBe(false)
  })
})

test.describe('Cart — Navigation', () => {
  test('Proceed to Checkout navigates to /checkout', async ({
    cartPage,
    seededCartProduct: _,
  }) => {
    await cartPage.goto()
    await cartPage.proceedToCheckout()
    await expect(cartPage.page).toHaveURL(/\/checkout/)
  })

  test('Continue Shopping navigates to / from empty cart', async ({ cartPage }) => {
    await cartPage.goto()
    await cartPage.continueShopping()
    await expect(cartPage.page).toHaveURL('/')
  })
})
