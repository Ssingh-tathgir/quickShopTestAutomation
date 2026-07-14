/**
 * API client for QuickShop product endpoints.
 *
 * Products are publicly accessible — no authentication token is required.
 * This client is used primarily by TestDataFactory to discover real product
 * IDs and stock levels before seeding test data.
 *
 * Endpoints covered:
 *   GET /products         — list all products (with optional search/category filters)
 *   GET /products/{id}    — fetch a single product by ID
 */
import { ApiClient, ApiResult } from './ApiClient'

/** Full product shape as returned by the QuickShop API. */
export interface Product {
  id: number
  name: string
  description: string
  category: string
  price: number
  stock: number        // Number of units available — 0 means out of stock
  image_url: string | null
}

export class ProductApiClient {
  private readonly client: ApiClient

  /**
   * @param baseUrl  API root URL, e.g. "http://localhost:8002"
   * @param token    Optional token — not required for product endpoints but
   *                 accepted for consistency with other clients
   */
  constructor(baseUrl: string, token?: string) {
    this.client = new ApiClient(baseUrl, token)
  }

  /**
   * Lists all products. Supports optional filtering by search term or category.
   * Used by the frontend home page and by TestDataFactory to find usable products.
   */
  getProducts(search?: string, category?: string): Promise<ApiResult<Product[]>> {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (category) params.set('category', category)
    const qs = params.toString()
    return this.client.get<Product[]>(`/products${qs ? '?' + qs : ''}`)
  }

  /** Fetches a single product by its database ID. */
  getProduct(id: number): Promise<ApiResult<Product>> {
    return this.client.get<Product>(`/products/${id}`)
  }

  /**
   * Returns the first product in the catalog that has at least 1 unit in stock.
   * Throws if the catalog is empty or all products are sold out.
   * Used for tests that just need any valid product to add to cart.
   */
  async getFirstInStockProduct(): Promise<Product> {
    const { data, ok } = await this.getProducts()
    if (!ok || !data?.length) throw new Error('No products available from API')
    const product = data.find(p => p.stock > 0)
    if (!product) throw new Error('No in-stock products found')
    return product
  }

  /**
   * Returns the first product with at least `minStock` units available.
   * Used when a test needs to increase quantity beyond 1 — for example,
   * testing quantity increment requires a product with stock >= 2.
   */
  async getProductWithStock(minStock: number = 2): Promise<Product> {
    const { data, ok } = await this.getProducts()
    if (!ok || !data?.length) throw new Error('No products available from API')
    const product = data.find(p => p.stock >= minStock)
    if (!product) throw new Error(`No product found with stock >= ${minStock}`)
    return product
  }
}
