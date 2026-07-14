# API Test Automation — Instruction Guide

This guide applies to any project using Playwright Test with TypeScript for API-level testing. Follow every rule and pattern here. When adding to an existing project, match what already exists in `tests/api/` and `src/api/` before introducing new patterns.

---

## Stack

| Concern | Tool |
|---|---|
| Test runner | `@playwright/test` |
| Language | TypeScript (strict mode) |
| Pattern | Domain API client classes — no UI, no browser |
| Base URL | Read from env config (`ENV.API_URL`) — never hard-coded |
| Config | `playwright.config.ts` — API project matches `tests/api/**/*.api.spec.ts` |

Import directly from `@playwright/test` in API spec files (not from a custom fixtures file):

```typescript
import { test, expect } from '@playwright/test'
```

---

## Project structure

```
src/
  config/
    env.ts                    ← All env vars. Always import ENV from here. Never use process.env directly.
  api/
    ApiClient.ts              ← Base HTTP client. All domain clients compose this — never extend it.
    AuthApiClient.ts          ← Authentication endpoints (login, register, token refresh)
    [Domain]ApiClient.ts      ← One file per API domain.
  utils/
    TestDataFactory.ts        ← User creation, entity seeding, cleanup. Use in beforeAll.

tests/
  api/
    [feature].api.spec.ts     ← One spec file per API domain or feature area.
```

---

## The ApiResult return type — every call returns this

```typescript
interface ApiResult<T> {
  data: T        // Parsed JSON body (null for 204 No Content)
  status: number  // Raw HTTP status code
  ok: boolean    // true when status is 200–299
}
```

Always destructure all three fields:

```typescript
const { data, status, ok } = await client.createItem(payload)
```

**Never call `fetch()` directly in a spec file.** Never call `.json()` or `.text()` yourself — the base client handles response parsing.

---

## Base HTTP client — ApiClient

`ApiClient` is the single place where HTTP mechanics live. All domain clients compose it; they do not extend it.

```typescript
export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token?: string,  // injected as Bearer header when present
  ) {}

  async get<T>(path: string): Promise<ApiResult<T>>
  async post<T>(path: string, body?: unknown): Promise<ApiResult<T>>
  async put<T>(path: string, body?: unknown): Promise<ApiResult<T>>
  async delete<T>(path: string): Promise<ApiResult<T>>
}
```

---

## Creating a new API client

Create one file per domain in `src/api/[Domain]ApiClient.ts`.

### Template

```typescript
/**
 * API client for [Domain] endpoints (/[base-path]/*).
 *
 * All endpoints [require / do not require] authentication.
 * [Brief note on any non-obvious behaviour, e.g. whether POST accumulates or replaces]
 *
 * Endpoints:
 *   GET    /[base-path]             — list or retrieve
 *   POST   /[base-path]             — create
 *   PUT    /[base-path]/{id}        — update
 *   DELETE /[base-path]/{id}        — delete
 */
import { ApiClient, ApiResult } from './ApiClient'

// ── Response types ────────────────────────────────────────────────────────────

export interface [Domain]Item {
  id: number
  // fields matching the API response shape
}

export interface [Domain]Response {
  // top-level response shape
  items?: [Domain]Item[]
  total?: number
}

// ── Client ────────────────────────────────────────────────────────────────────

export class [Domain]ApiClient {
  private readonly client: ApiClient

  /**
   * @param baseUrl  API root URL, e.g. "http://localhost:8000"
   * @param token    JWT token — required if any endpoints are authenticated
   */
  constructor(baseUrl: string, token?: string) {
    this.client = new ApiClient(baseUrl, token)
  }

  list(): Promise<ApiResult<[Domain]Item[]>> {
    return this.client.get<[Domain]Item[]>('/[base-path]')
  }

  getById(id: number): Promise<ApiResult<[Domain]Item>> {
    return this.client.get<[Domain]Item>(`/[base-path]/${id}`)
  }

  create(payload: { [field]: [type] }): Promise<ApiResult<[Domain]Item>> {
    return this.client.post<[Domain]Item>('/[base-path]', payload)
  }

  update(id: number, payload: { [field]: [type] }): Promise<ApiResult<[Domain]Item>> {
    return this.client.put<[Domain]Item>(`/[base-path]/${id}`, payload)
  }

  remove(id: number): Promise<ApiResult<[Domain]Item>> {
    return this.client.delete<[Domain]Item>(`/[base-path]/${id}`)
  }

  /**
   * Utility: delete all entities belonging to the authenticated user.
   * Used in afterEach to reset state between tests.
   */
  async deleteAll(): Promise<void> {
    const { data } = await this.list()
    for (const item of data ?? []) {
      await this.remove(item.id)
    }
  }
}

/**
 * Returns an unauthenticated ApiClient for 401 tests.
 * Use when verifying that a protected endpoint rejects requests without a token.
 */
export function unauthenticated[Domain]Client(baseUrl: string): ApiClient {
  return new ApiClient(baseUrl)
}
```

---

## Creating a new spec file

```typescript
/**
 * API tests for [Feature / Domain].
 *
 * Covers:
 *   [list of endpoints and key scenarios]
 *
 * Prerequisites: API must be running at ENV.API_URL.
 */
import { test, expect } from '@playwright/test'
import { [Domain]ApiClient, unauthenticated[Domain]Client } from '../../src/api/[Domain]ApiClient'
import { TestDataFactory } from '../../src/utils/TestDataFactory'
import { ENV } from '../../src/config/env'

// ── Suite-level state ─────────────────────────────────────────────────────────
// Use let (not const) — these are assigned in beforeAll, not at declaration time.

let token: string
let entityId: number      // ID of a real entity fetched in beforeAll
let entityValue: number   // A field value used in assertions (e.g. price, stock)

test.beforeAll(async () => {
  const factory = new TestDataFactory(ENV.API_URL)
  // One user per spec file — not per test. User creation is slow.
  const user = await factory.createTestUser()
  token = user.token

  // Fetch a real entity — never assume IDs are stable across environments
  const entity = await factory.getFirstAvailableEntity()
  entityId = entity.id
  entityValue = entity.someField
})

test.afterEach(async () => {
  // Reset the state touched by each test
  const client = new [Domain]ApiClient(ENV.API_URL, token)
  await client.deleteAll().catch(() => {})
})

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('GET /[base-path]', () => {

  test('returns empty list for a new user', async () => {
    const client = new [Domain]ApiClient(ENV.API_URL, token)
    const { data, status, ok } = await client.list()

    expect(ok).toBe(true)
    expect(status).toBe(200)
    expect(data).toHaveLength(0)
  })

  test('returns 401 for unauthenticated request', async () => {
    const client = unauthenticated[Domain]Client(ENV.API_URL)
    const { status } = await client.get('/[base-path]')
    expect(status).toBe(401)
  })

})

test.describe('POST /[base-path]', () => {

  test('creates entity and returns 201 with the created resource', async () => {
    const client = new [Domain]ApiClient(ENV.API_URL, token)
    const { data, status, ok } = await client.create({ field: 'value' })

    expect(ok).toBe(true)
    expect(status).toBe(201)
    expect(data.id).toBeDefined()
    expect(data.field).toBe('value')
  })

})
```

---

## TestDataFactory — purpose and usage

`TestDataFactory` is the single entry point for all test data setup. Never call `AuthApiClient` or domain API clients directly in spec files to create users or seed data — put that logic in the factory.

```typescript
const factory = new TestDataFactory(ENV.API_URL)

// Create a unique test user — call once in beforeAll, not beforeEach
// Email uses a millisecond timestamp to guarantee uniqueness across parallel runs
const user = await factory.createTestUser()
// Returns: { email, password, token, ... }

// Fetch a real entity from the live system — never hard-code IDs
const entity = await factory.getFirstAvailableEntity()

// Fetch an entity that meets a specific condition (e.g. minimum stock, specific status)
const entity = await factory.getEntityWithCondition(/* criteria */)

// Seed state before a test
await factory.seedEntityForUser(user.token, { /* payload */ })

// Cleanup — called in afterEach
await factory.deleteAllForUser(user.token)
```

**Timing rules:**

| Call | In |
|---|---|
| `createTestUser()` | `beforeAll` — one user per spec file |
| Fetching reference entities | `beforeAll` — entity IDs don't change mid-run |
| Seeding state for a specific test | `beforeEach` or inside the test itself |
| Cleanup | `afterEach` — always, to prevent state leaking between tests |

---

## Authentication

Applications typically use JWT Bearer tokens obtained via a login endpoint.

**Authenticated client:**

```typescript
const client = new [Domain]ApiClient(ENV.API_URL, token)
```

**Unauthenticated client (for 401 tests):**

```typescript
const client = unauthenticated[Domain]Client(ENV.API_URL)
const { status } = await client.get('/[base-path]')
expect(status).toBe(401)
```

**Every protected endpoint must have at least one 401 test.** This verifies auth enforcement is not accidentally removed.

---

## Error codes — what to test for every endpoint

Cover all relevant codes, not just the happy path.

| Code | Trigger | When to test |
|---|---|---|
| 200 | Successful GET, PUT, DELETE | Always |
| 201 | Successful POST (created) | Always for creation endpoints |
| 400 | Business rule violation | When the endpoint enforces domain constraints |
| 401 | Missing or invalid auth token | Always for authenticated endpoints |
| 403 | Authenticated but not authorised | When role/ownership checks exist |
| 404 | Resource not found | Always for endpoints that accept a resource ID |
| 409 | Conflict (e.g. duplicate unique field) | When uniqueness is enforced |
| 422 | Invalid request body (type errors, constraint violations) | Always for endpoints that validate input |

**Testing 404:**

```typescript
test('returns 404 when resource does not exist', async () => {
  const client = new [Domain]ApiClient(ENV.API_URL, token)
  const { status, ok } = await client.getById(999999999)
  expect(ok).toBe(false)
  expect(status).toBe(404)
})
```

**Testing 422:**

```typescript
test('returns 422 for invalid input', async () => {
  const client = new [Domain]ApiClient(ENV.API_URL, token)
  const { status, ok } = await client.create({ quantity: -1 })
  expect(ok).toBe(false)
  expect(status).toBe(422)
})
```

---

## Assertions

```typescript
// Success / failure
expect(ok).toBe(true)
expect(ok).toBe(false)
expect(status).toBe(201)
expect(status).toBe(404)

// Response shape
expect(data).toHaveLength(1)
expect(data).toHaveLength(0)
expect(data).toHaveProperty('detail')     // error response body

// Field values
expect(data.name).toBe('expected name')
expect(data.quantity).toBe(2)

// Floating-point / monetary values — ALWAYS toBeCloseTo, never toBe
expect(data.total).toBeCloseTo(price * qty, 2)

// Computed field — derive from the response, not a hard-coded number
const expected = data.items.reduce((sum, i) => sum + i.line_value, 0)
expect(data.total).toBeCloseTo(expected, 2)

// Specific item in a collection
const item = data.items.find(i => i.id === entityId)
expect(item).toBeDefined()
expect(item!.quantity).toBe(1)
```

---

## Business rule validation — checklist for each new domain

For every new API domain, verify these invariants:

- [ ] **Computed fields are consistent.** If the response contains both a sum and the items it summed, verify the sum matches what you calculate from the items.
- [ ] **Count semantics.** If there is a `count` field, verify whether it counts unique records or an aggregate (e.g. total units). They differ.
- [ ] **Idempotency.** Where appropriate: calling the same operation twice should not duplicate a resource. Test explicitly.
- [ ] **Accumulation vs. replacement.** For PUT / PATCH: does it replace the field or increment it? Test both directions by reading state back after the mutation.
- [ ] **Capacity or limit enforcement.** If the entity has a maximum (stock, quota, length), verify the API rejects requests exceeding it with 400.
- [ ] **Uniqueness constraints.** If a field must be unique, verify a duplicate is rejected with 409.
- [ ] **Auth enforcement.** Every mutating endpoint must return 401 when no token is provided.
- [ ] **404 for unknown IDs.** Every endpoint that accepts a resource ID must return 404 when that ID does not exist.

---

## Test isolation — rules

**Never let one test depend on the state produced by another test.** Playwright can run tests in any order, and in parallel. Always set up required state in `beforeEach` and clean it up in `afterEach`.

```typescript
// Correct — each test that needs an existing entity sets it up independently
test.describe('PUT /[base-path]/{id}', () => {

  let createdId: number

  test.beforeEach(async () => {
    const client = new [Domain]ApiClient(ENV.API_URL, token)
    const { data } = await client.create({ field: 'initial value' })
    createdId = data.id
  })

  test.afterEach(async () => {
    const client = new [Domain]ApiClient(ENV.API_URL, token)
    await client.remove(createdId).catch(() => {})
  })

  test('updates the field and returns 200', async () => {
    const client = new [Domain]ApiClient(ENV.API_URL, token)
    const { data, ok } = await client.update(createdId, { field: 'updated value' })
    expect(ok).toBe(true)
    expect(data.field).toBe('updated value')
  })

})
```

```typescript
// Wrong — test B silently depends on test A having run
test('A creates entity', async () => { await client.create({ field: 'x' }) })
test('B updates entity', async () => { await client.update(someId, { field: 'y' }) })  // fragile
```

---

## Test naming convention

```
describe:  '[HTTP METHOD] /[path]'
           or '[Domain] response — [category]' for cross-cutting tests
test:      '[expected outcome] when [condition]'

Good:
  describe: 'POST /orders'
  test:     'returns 201 with created order when payload is valid'
  test:     'returns 400 when quantity exceeds available stock'
  test:     'returns 422 when required field is missing'
  test:     'returns 401 when no token is provided'

  describe: 'Order response — data integrity'
  test:     'total equals sum of all line amounts'
  test:     'item_count reflects total units not unique products'

Bad:
  'test order'
  'happy path'
  'it works'
```

---

## Data integrity tests — separate describe block

Tests that validate computed fields and cross-field consistency belong in their own `describe` block. These are read-only tests that seed state first, then verify the response shape.

```typescript
test.describe('[Domain] response — data integrity', () => {

  test.beforeEach(async () => {
    const factory = new TestDataFactory(ENV.API_URL)
    await factory.seedEntityForUser(token, { quantity: 3, /* ... */ })
  })

  test.afterEach(async () => {
    const client = new [Domain]ApiClient(ENV.API_URL, token)
    await client.deleteAll().catch(() => {})
  })

  test('total equals sum of all line amounts', async () => {
    const client = new [Domain]ApiClient(ENV.API_URL, token)
    const { data } = await client.list()
    const computed = data.items.reduce((sum, i) => sum + i.line_amount, 0)
    expect(data.total).toBeCloseTo(computed, 2)
  })

  test('count reflects total units not unique items', async () => {
    const client = new [Domain]ApiClient(ENV.API_URL, token)
    const { data } = await client.list()
    expect(data.item_count).toBe(3)     // 3 units
    expect(data.items).toHaveLength(1)  // 1 unique entity
  })

})
```

---

## Cleanup patterns

| Where | What to clean up |
|---|---|
| `afterEach` | State mutated by the test (created, updated, or deleted resources) |
| Fixture teardown (after `await use(...)`) | State created by that fixture |
| `afterAll` | Nothing — test users and static reference data do not need cleanup |

Always `.catch(() => {})` on cleanup calls — a cleanup failure should not mask the real test result:

```typescript
test.afterEach(async () => {
  const client = new [Domain]ApiClient(ENV.API_URL, token)
  await client.deleteAll().catch(() => {})
})
```

---

## Anti-patterns — never do these

```typescript
// ✗ Hard-coded resource ID
await client.getById(42)   // this ID may not exist in other environments

// ✗ Calling fetch() directly in a spec file
const res = await fetch(`${ENV.API_URL}/items`)

// ✗ Creating a user in beforeEach
test.beforeEach(async () => {
  const user = await factory.createTestUser()  // slow — do this in beforeAll
})

// ✗ Tests that depend on each other's state
test('A creates', async () => { await client.create(payload) })
test('B reads what A created', async () => { await client.getById(id) })  // fragile

// ✗ Exact equality on floating-point / monetary fields
expect(data.total).toBe(19.99)           // floating-point equality is unreliable
expect(data.total).toBeCloseTo(19.99, 2) // correct

// ✗ Hard-coded expected value derived from a price you assume
expect(data.total).toBe(productPrice * 2)   // breaks if the product price changes in the seed
// Instead: derive from what the response itself tells you
expect(data.total).toBeCloseTo(data.items[0].unit_price * 2, 2)

// ✗ No 401 test on protected endpoints
// Every authenticated endpoint must have a test verifying 401 without a token

// ✗ Swallowing factory errors
try { token = (await factory.createTestUser()).token } catch { token = '' }
// Let it throw — if setup fails, the tests should not run with empty state
```

---

## Adding a new API client — step by step

1. Create `src/api/[Domain]ApiClient.ts` using the template above
2. Define response type interfaces at the top
3. Export `unauthenticated[Domain]Client()` if any endpoints require auth
4. Create `tests/api/[domain].api.spec.ts` using the spec template above
5. Cover all endpoints: GET (list + get by ID), POST, PUT, DELETE
6. Cover all applicable error codes: 201, 200, 400, 401, 403, 404, 409, 422
7. Add a data integrity describe block if the response contains computed fields
8. Add the domain client's methods to `TestDataFactory` if tests in other spec files need to seed this domain's data
