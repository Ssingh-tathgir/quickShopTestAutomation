import { test, expect } from '@playwright/test'
import { AuthApiClient } from '../../src/api/AuthApiClient'
import { CartApiClient, unauthenticatedCartClient } from '../../src/api/CartApiClient'
import { ProductApiClient } from '../../src/api/ProductApiClient'
import { TestDataFactory } from '../../src/utils/TestDataFactory'
import { ENV } from '../../src/config/env'

let token: string
let productId: number
let productPrice: number
let productStock: number

test.beforeAll(async () => {
  const factory = new TestDataFactory(ENV.API_URL)
  const user = await factory.createTestUser()
  token = user.token

  const productClient = new ProductApiClient(ENV.API_URL)
  const product = await productClient.getProductWithStock(2)
  productId = product.id
  productPrice = product.price
  productStock = product.stock
})

test.afterEach(async () => {
  const cart = new CartApiClient(ENV.API_URL, token)
  await cart.clearCart()
})

test.describe('GET /cart', () => {
  test('returns empty cart for a new authenticated user', async () => {
    const cart = new CartApiClient(ENV.API_URL, token)
    const { data, status, ok } = await cart.getCart()

    expect(ok).toBe(true)
    expect(status).toBe(200)
    expect(data.items).toHaveLength(0)
    expect(data.subtotal).toBe(0)
    expect(data.item_count).toBe(0)
  })

  test('returns 401 for unauthenticated request', async () => {
    const client = unauthenticatedCartClient(ENV.API_URL)
    const { status } = await client.get('/cart')
    expect(status).toBe(401)
  })
})

test.describe('POST /cart/items', () => {
  test('adds item to cart and returns 201 with cart response', async () => {
    const cart = new CartApiClient(ENV.API_URL, token)
    const { data, status, ok } = await cart.addItem(productId, 1)

    expect(ok).toBe(true)
    expect(status).toBe(201)
    expect(data.items).toHaveLength(1)
    expect(data.items[0].product.id).toBe(productId)
    expect(data.items[0].quantity).toBe(1)
    expect(data.items[0].line_total).toBeCloseTo(productPrice, 2)
    expect(data.subtotal).toBeCloseTo(productPrice, 2)
    expect(data.item_count).toBe(1)
  })

  test('accumulates quantity when same item added twice', async () => {
    const cart = new CartApiClient(ENV.API_URL, token)
    await cart.addItem(productId, 1)
    const { data, status } = await cart.addItem(productId, 1)

    expect(status).toBe(201)
    expect(data.items).toHaveLength(1)
    expect(data.items[0].quantity).toBe(2)
    expect(data.item_count).toBe(2)
    expect(data.subtotal).toBeCloseTo(productPrice * 2, 2)
  })

  test('returns 400 when quantity exceeds stock', async () => {
    const cart = new CartApiClient(ENV.API_URL, token)
    const { data, status, ok } = await cart.addItem(productId, productStock + 1)

    expect(ok).toBe(false)
    expect(status).toBe(400)
    expect(data).toHaveProperty('detail')
  })

  test('returns 400 when cumulative quantity exceeds stock', async () => {
    const cart = new CartApiClient(ENV.API_URL, token)
    await cart.addItem(productId, productStock)
    const { status, ok } = await cart.addItem(productId, 1)

    expect(ok).toBe(false)
    expect(status).toBe(400)
  })

  test('returns 404 for non-existent product', async () => {
    const cart = new CartApiClient(ENV.API_URL, token)
    const { status, ok } = await cart.addItem(999999, 1)

    expect(ok).toBe(false)
    expect(status).toBe(404)
  })

  test('returns 422 for quantity of 0', async () => {
    const cart = new CartApiClient(ENV.API_URL, token)
    const { status, ok } = await cart.addItem(productId, 0)

    expect(ok).toBe(false)
    expect(status).toBe(422)
  })

  test('returns 422 for negative quantity', async () => {
    const cart = new CartApiClient(ENV.API_URL, token)
    const { status, ok } = await cart.addItem(productId, -1)

    expect(ok).toBe(false)
    expect(status).toBe(422)
  })

  test('returns 401 for unauthenticated request', async () => {
    const client = unauthenticatedCartClient(ENV.API_URL)
    const { status } = await client.post('/cart/items', { product_id: productId, quantity: 1 })
    expect(status).toBe(401)
  })

  test('line_total equals price × quantity', async () => {
    const cart = new CartApiClient(ENV.API_URL, token)
    const { data } = await cart.addItem(productId, 2)
    const item = data.items.find(i => i.product.id === productId)!
    expect(item.line_total).toBeCloseTo(item.product.price * item.quantity, 2)
  })
})

test.describe('PUT /cart/items/{product_id}', () => {
  test.beforeEach(async () => {
    const cart = new CartApiClient(ENV.API_URL, token)
    await cart.addItem(productId, 1)
  })

  test('updates item quantity and recalculates subtotal', async () => {
    const cart = new CartApiClient(ENV.API_URL, token)
    const { data, status, ok } = await cart.updateItem(productId, 3)

    expect(ok).toBe(true)
    expect(status).toBe(200)
    expect(data.items[0].quantity).toBe(3)
    expect(data.items[0].line_total).toBeCloseTo(productPrice * 3, 2)
    expect(data.subtotal).toBeCloseTo(productPrice * 3, 2)
    expect(data.item_count).toBe(3)
  })

  test('returns 400 when update quantity exceeds stock', async () => {
    const cart = new CartApiClient(ENV.API_URL, token)
    const { status, ok } = await cart.updateItem(productId, productStock + 1)

    expect(ok).toBe(false)
    expect(status).toBe(400)
  })

  test('returns 422 for quantity of 0', async () => {
    const cart = new CartApiClient(ENV.API_URL, token)
    const { status, ok } = await cart.updateItem(productId, 0)

    expect(ok).toBe(false)
    expect(status).toBe(422)
  })

  test('returns 404 when item is not in cart', async () => {
    const cart = new CartApiClient(ENV.API_URL, token)
    const { status, ok } = await cart.updateItem(999999, 1)

    expect(ok).toBe(false)
    expect(status).toBe(404)
  })

  test('returns 401 for unauthenticated request', async () => {
    const client = unauthenticatedCartClient(ENV.API_URL)
    const { status } = await client.put(`/cart/items/${productId}`, { quantity: 2 })
    expect(status).toBe(401)
  })
})

test.describe('DELETE /cart/items/{product_id}', () => {
  test.beforeEach(async () => {
    const cart = new CartApiClient(ENV.API_URL, token)
    await cart.addItem(productId, 1)
  })

  test('removes item and returns updated cart', async () => {
    const cart = new CartApiClient(ENV.API_URL, token)
    const { data, status, ok } = await cart.removeItem(productId)

    expect(ok).toBe(true)
    expect(status).toBe(200)
    expect(data.items).toHaveLength(0)
    expect(data.subtotal).toBe(0)
    expect(data.item_count).toBe(0)
  })

  test('returns 404 when item is not in cart', async () => {
    const cart = new CartApiClient(ENV.API_URL, token)
    const { status, ok } = await cart.removeItem(999999)

    expect(ok).toBe(false)
    expect(status).toBe(404)
  })

  test('returns 401 for unauthenticated request', async () => {
    const client = unauthenticatedCartClient(ENV.API_URL)
    const { status } = await client.delete(`/cart/items/${productId}`)
    expect(status).toBe(401)
  })

  test('removing last item results in empty cart', async () => {
    const cart = new CartApiClient(ENV.API_URL, token)
    await cart.removeItem(productId)
    const { data } = await cart.getCart()

    expect(data.items).toHaveLength(0)
    expect(data.item_count).toBe(0)
    expect(data.subtotal).toBe(0)
  })
})

test.describe('Cart response — data integrity', () => {
  test('item_count reflects total units not unique items', async () => {
    const cart = new CartApiClient(ENV.API_URL, token)
    await cart.addItem(productId, 3)
    const { data } = await cart.getCart()

    expect(data.item_count).toBe(3)
    expect(data.items).toHaveLength(1)
  })

  test('subtotal equals sum of all line totals', async () => {
    const cart = new CartApiClient(ENV.API_URL, token)
    await cart.addItem(productId, 2)
    const { data } = await cart.getCart()

    const expectedSubtotal = data.items.reduce((sum, i) => sum + i.line_total, 0)
    expect(data.subtotal).toBeCloseTo(expectedSubtotal, 2)
  })
})
