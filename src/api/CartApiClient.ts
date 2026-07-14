/**
 * API client for QuickShop cart endpoints.
 *
 * All cart endpoints require authentication — the JWT token is passed in the
 * constructor and injected as a Bearer header on every request.
 *
 * Endpoints covered:
 *   GET    /cart                    — retrieve the full cart for the authenticated user
 *   POST   /cart/items              — add a product (or increase quantity if already present)
 *   PUT    /cart/items/{product_id} — update the quantity of an existing cart item
 *   DELETE /cart/items/{product_id} — remove an item from the cart
 *
 * Every mutating endpoint returns the full updated CartResponse so callers
 * always have the latest cart state after each operation.
 */
import { ApiClient, ApiResult } from './ApiClient'

/** Minimal product data embedded inside each cart item. */
export interface CartProduct {
  id: number
  name: string
  description: string
  category: string
  price: number
  stock: number       // Current available stock — used to cap quantity in the UI
  image_url: string | null
}

/** A single line in the cart — one product and its chosen quantity. */
export interface CartItem {
  id: number           // Cart item record ID (not the product ID)
  product: CartProduct
  quantity: number
  line_total: number   // price × quantity, rounded to 2 decimal places by the backend
}

/**
 * Full cart response returned by every cart endpoint.
 * Note: item_count is the total number of units (sum of quantities),
 * not the number of unique products.
 */
export interface CartResponse {
  items: CartItem[]
  subtotal: number    // Sum of all line_totals
  item_count: number  // Total units across all items (e.g. 2 × Shirt + 1 × Hat = 3)
}

export class CartApiClient {
  private readonly client: ApiClient

  /**
   * @param baseUrl  API root URL, e.g. "http://localhost:8002"
   * @param token    JWT token from AuthApiClient.login() — required for all cart calls
   */
  constructor(baseUrl: string, token: string) {
    this.client = new ApiClient(baseUrl, token)
  }

  /** Fetches the current cart. Returns an empty items array for a new user. */
  getCart(): Promise<ApiResult<CartResponse>> {
    return this.client.get<CartResponse>('/cart')
  }

  /**
   * Adds a product to the cart.
   * If the product is already in the cart, the quantities are accumulated
   * (not replaced). Returns 400 if the resulting quantity exceeds stock.
   * Returns 201 Created on success.
   */
  addItem(productId: number, quantity: number = 1): Promise<ApiResult<CartResponse>> {
    return this.client.post<CartResponse>('/cart/items', { product_id: productId, quantity })
  }

  /**
   * Sets the quantity of an existing cart item to a new value.
   * This is a replacement, not an increment. Returns 400 if quantity exceeds stock.
   * Returns 404 if the product is not in the cart.
   */
  updateItem(productId: number, quantity: number): Promise<ApiResult<CartResponse>> {
    return this.client.put<CartResponse>(`/cart/items/${productId}`, { quantity })
  }

  /**
   * Removes a product entirely from the cart regardless of its quantity.
   * Returns 404 if the product is not currently in the cart.
   */
  removeItem(productId: number): Promise<ApiResult<CartResponse>> {
    return this.client.delete<CartResponse>(`/cart/items/${productId}`)
  }

  /**
   * Utility method that removes every item from the cart.
   * Used in test afterEach hooks to reset cart state between tests.
   * Fetches the cart first, then deletes each item individually.
   */
  async clearCart(): Promise<void> {
    const { data } = await this.getCart()
    for (const item of data?.items ?? []) {
      await this.removeItem(item.product.id)
    }
  }
}

/**
 * Returns a raw ApiClient with no token attached.
 * Used in API tests that verify unauthenticated requests are rejected with 401.
 */
export function unauthenticatedCartClient(baseUrl: string): ApiClient {
  return new ApiClient(baseUrl)
}
