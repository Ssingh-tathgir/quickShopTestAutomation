import { ApiClient, ApiResult } from './ApiClient'

export interface CartProduct {
  id: number
  name: string
  description: string
  category: string
  price: number
  stock: number
  image_url: string | null
}

export interface CartItem {
  id: number
  product: CartProduct
  quantity: number
  line_total: number
}

export interface CartResponse {
  items: CartItem[]
  subtotal: number
  item_count: number
}

export class CartApiClient {
  private readonly client: ApiClient

  constructor(baseUrl: string, token: string) {
    this.client = new ApiClient(baseUrl, token)
  }

  getCart(): Promise<ApiResult<CartResponse>> {
    return this.client.get<CartResponse>('/cart')
  }

  addItem(productId: number, quantity: number = 1): Promise<ApiResult<CartResponse>> {
    return this.client.post<CartResponse>('/cart/items', { product_id: productId, quantity })
  }

  updateItem(productId: number, quantity: number): Promise<ApiResult<CartResponse>> {
    return this.client.put<CartResponse>(`/cart/items/${productId}`, { quantity })
  }

  removeItem(productId: number): Promise<ApiResult<CartResponse>> {
    return this.client.delete<CartResponse>(`/cart/items/${productId}`)
  }

  async clearCart(): Promise<void> {
    const { data } = await this.getCart()
    for (const item of data?.items ?? []) {
      await this.removeItem(item.product.id)
    }
  }
}

export function unauthenticatedCartClient(baseUrl: string): ApiClient {
  return new ApiClient(baseUrl)
}
