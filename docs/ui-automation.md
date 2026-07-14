# QuickShop UI Automation — Instruction Guide

## Framework
- **Runner**: Playwright Test (`@playwright/test`)
- **Language**: TypeScript (strict mode)
- **Pattern**: Page Object Model (POM)
- **Browser**: Chromium (headless by default)
- **Base URL**: Configured via `BASE_URL` env var (default: `http://localhost:3000`)

## Project structure

```
src/
  config/env.ts          ← All env vars, import ENV from here
  api/                   ← Direct API clients (for setup/teardown, not in UI specs)
  pages/                 ← Page Object classes, one per route
  utils/TestDataFactory  ← Creates test users, seeds cart data via API
  fixtures/fixtures.ts   ← Extended test fixtures (use instead of base `test`)
tests/ui/               ← All UI spec files go here
```

## How to write a UI test

Always import from fixtures, never from `@playwright/test` directly:

```typescript
import { test, expect } from '../../src/fixtures/fixtures'
```

Use available fixtures as parameters:
- `testUser` — a freshly created test user (email, password, token)
- `authenticatedPage` — a `Page` already logged in as testUser
- `cartPage` — a `CartPage` instance on an authenticated page
- `productListPage` — a `ProductListPage` instance on an authenticated page
- `productDetailPage` — a `ProductDetailPage` instance on an authenticated page
- `seededCartProduct` — seeds one product into cart, returns the Product; cleans up after test

## Page Objects

All page objects extend `BasePage` and live in `src/pages/`.

**BasePage** provides:
- `toast` locator — the fixed top-right notification div
- `getToastMessage()` — waits for and returns toast text
- `getCartCount()` — reads the navbar cart count badge
- `cartNavLink` — the Cart link in the navbar

**Always use page object methods, never raw `page.locator()` in specs.**

If a method you need doesn't exist on a page object, add it to the page object — do not inline the locator in the spec.

## Selector strategy (in order of preference)

1. `getByRole()` with accessible name — most resilient
2. `getByLabel()` — for form inputs
3. `getByText()` — for visible text content
4. `locator('[class*="..."]')` — only when no semantic selector exists
5. `data-testid` — preferred when added to the codebase (request dev team to add these)

**Never use**: XPath, positional selectors like `:nth-child()`, or CSS selectors that depend on visual style classes.

## Test data

**Never hard-code credentials or product IDs.** Always use `TestDataFactory`:

```typescript
// In a test
const factory = new TestDataFactory(ENV.API_URL)
const user = await factory.createTestUser()        // unique per run
const product = await factory.getFirstInStockProduct()
await factory.seedCart(user.token, product.id, 1)
```

The `seededCartProduct` fixture handles this automatically for cart tests.

## Authentication

UI tests authenticate by navigating to `/auth/login` and filling the form — this tests the real auth flow. The `authenticatedPage` fixture handles this. Never manually set `localStorage` in specs.

## Assertions

```typescript
await expect(cartPage.heading).toBeVisible()
await expect(cartPage.emptyStateMessage).toBeVisible()
await expect(page).toHaveURL(/\/checkout/)
expect(qty).toBe(2)
expect(lineTotal).toBeCloseTo(price * qty, 2)
```

Use `toBeCloseTo(value, 2)` for all price/monetary comparisons (floating point).

## Waiting strategy

- Use Playwright's built-in auto-waiting — do NOT add manual `page.waitForTimeout()` calls
- For quantity/subtotal updates: call `page.waitForLoadState('networkidle')` after clicking +/−
- For toast: use `getToastMessage()` which internally calls `waitFor({ state: 'visible' })`

## Test naming convention

```
describe block: 'Cart — [Category]'
test name: '[action] [expected outcome]'
Examples:
  'adds product from product list page and shows success toast'
  'decrease button is disabled when quantity is 1'
  'removes item and shows empty state when cart becomes empty'
```

## Cleanup

Fixtures handle cleanup automatically. For tests that seed data manually:

```typescript
test.afterEach(async ({ testUser }) => {
  const cart = new CartApiClient(ENV.API_URL, testUser.token)
  await cart.clearCart()
})
```

## Known gaps (request data-testid from dev team)

The following elements currently lack `data-testid` attributes. Tests use class-based selectors as a fallback. These should be added to the source code for better resilience:
- Cart item container: suggest `data-testid="cart-item"`
- Quantity display span: suggest `data-testid="qty-display"`
- Toast container: suggest `data-testid="toast"`
- Order summary total: suggest `data-testid="order-total"`
