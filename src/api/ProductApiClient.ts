import { ApiClient, ApiResult } from './ApiClient'

export interface Product {
  id: number
  name: string
  description: string
  category: string
  price: number
  stock: number
  image_url: string | null
}

export class ProductApiClient {
  private readonly client: ApiClient

  constructor(baseUrl: string, token?: string) {
    this.client = new ApiClient(baseUrl, token)
  }

  getProducts(search?: string, category?: string): Promise<ApiResult<Product[]>> {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (category) params.set('category', category)
    const qs = params.toString()
    return this.client.get<Product[]>(`/products${qs ? '?' + qs : ''}`)
  }

  getProduct(id: number): Promise<ApiResult<Product>> {
    return this.client.get<Product>(`/products/${id}`)
  }

  async getFirstInStockProduct(): Promise<Product> {
    const { data, ok } = await this.getProducts()
    if (!ok || !data?.length) throw new Error('No products available from API')
    const product = data.find(p => p.stock > 0)
    if (!product) throw new Error('No in-stock products found')
    return product
  }

  async getProductWithStock(minStock: number = 2): Promise<Product> {
    const { data, ok } = await this.getProducts()
    if (!ok || !data?.length) throw new Error('No products available from API')
    const product = data.find(p => p.stock >= minStock)
    if (!product) throw new Error(`No product found with stock >= ${minStock}`)
    return product
  }
}
