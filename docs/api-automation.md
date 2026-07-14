# QuickShop API Automation — Instruction Guide

## Framework
- **Runner**: Playwright Test (`@playwright/test`)
- **Language**: TypeScript (strict mode)
- **Pattern**: API client classes per domain (no UI, no browser)
- **Base URL**: Configured via `API_URL` env var (default: `http://localhost:8002`)

## Project structure

```
src/
  config/env.ts          ← All env vars, import ENV from here
  api/
    ApiClient.ts         ← Base HTTP client (handles headers, token injection)
    AuthApiClient.ts     ← /auth/* endpoints
    CartApiClient.ts     ← /cart/* endpoints
    ProductApiClient.ts  ← /products/* endpoints
  utils/TestDataFactory  ← Creates test users, provides products with stock
tests/api/              ← All API spec files go here
```

## Authentication

QuickShop uses **JWT Bearer tokens**. Token is obtained via `POST /auth/login`.

```typescript
const auth = new AuthApiClient(ENV.API_URL)
const { data } = await auth.login(email, password)
const token = data.access_token

// Use token with domain clients
const cart = new CartApiClient(ENV.API_URL, token)
```

Token is passed as `Authorization: Bearer <token>` header. `CartApiClient` handles this internally.

## How to write an API test

```typescript
import { test, expect } from '@playwright/test'
import { CartApiClient } from '../../src/api/CartApiClient'
import { TestDataFactory } from '../../src/utils/TestDataFactory'
import { ENV } from '../../src/config/env'

let token: string
let productId: number

test.beforeAll(async () => {
  const factory = new TestDataFactory(ENV.API_URL)
  const user = await factory.createTestUser()   // unique per run
  token = user.token
  const product = await factory.getFirstInStockProduct()
  productId = product.id
})

test.afterEach(async () => {
  const cart = new CartApiClient(ENV.API_URL, token)
  await cart.clearCart()   // always clean up after each test
})
```

## API clients

All clients return `{ data, status, ok }`:

```typescript
const { data, status, ok } = await cart.addItem(productId, 1)
```

- `ok` — true if `status` is 2xx
- `data` — parsed JSON response body
- `status` — HTTP status code

**CartApiClient methods:**
- `getCart()` → `CartResponse`
- `addItem(productId, quantity)` → `CartResponse` (status 201 on success)
- `updateItem(productId, quantity)` → `CartResponse`
- `removeItem(productId)` → `CartResponse`
- `clearCart()` → removes all items (utility method)

**Unauthenticated requests** — use `unauthenticatedCartClient()`:

```typescript
import { unauthenticatedCartClient } from '../../src/api/CartApiClient'
const client = unauthenticatedCartClient(ENV.API_URL)
const { status } = await client.get('/cart')
expect(status).toBe(401)
```

## Cart API endpoints

| Method | Path | Auth | Body | Success |
|--------|------|------|------|---------|
| GET | /cart | Required | — | 200 CartResponse |
| POST | /cart/items | Required | `{ product_id, quantity }` | 201 CartResponse |
| PUT | /cart/items/{product_id} | Required | `{ quantity }` | 200 CartResponse |
| DELETE | /cart/items/{product_id} | Required | — | 200 CartResponse |

## CartResponse shape

```typescript
{
  items: [{
    id: number
    product: { id, name, description, category, price, stock, image_url }
    quantity: number
    line_total: number          // price × quantity, rounded to 2dp
  }]
  subtotal: number              // sum of all line_totals
  item_count: number            // sum of all quantities (not unique items)
}
```

## Error codes to test

| Status | Scenario |
|--------|----------|
| 400 | Quantity exceeds product stock |
| 401 | Missing or invalid token |
| 404 | Product not found / item not in cart |
| 422 | Invalid request body (quantity < 1) |

## Assertions

```typescript
expect(ok).toBe(true)
expect(status).toBe(201)
expect(data.items).toHaveLength(1)
expect(data.items[0].quantity).toBe(2)
expect(data.subtotal).toBeCloseTo(price * qty, 2)  // always use toBeCloseTo for prices
```

## Test data rules

- **Never hard-code** product IDs, user credentials, or stock values — these change between environments
- Use `TestDataFactory.createTestUser()` — creates a unique user per test suite (use `beforeAll`, not `beforeEach`)
- Use `TestDataFactory.getProductWithStock(n)` when a test needs a product with at least `n` units in stock
- Always `clearCart()` in `afterEach` — tests must not depend on cart state from previous tests

## Test naming convention

```
describe block: 'POST /cart/items'
test name: '[what happens] when [condition]'
Examples:
  'returns 201 with updated cart when item is added'
  'returns 400 when quantity exceeds stock'
  'accumulates quantity when same item added twice'
```

## Business rules to validate

1. Adding the same product twice accumulates quantity (no duplicates)
2. `item_count` = total units (sum of quantities), not unique product count
3. `subtotal` = sum of all `line_total` values
4. `line_total` = `product.price × quantity` rounded to 2 decimal places
5. Adding or updating beyond `product.stock` → 400
6. All mutation endpoints require auth → 401 when token missing
