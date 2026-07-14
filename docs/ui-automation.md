# UI Test Automation — Instruction Guide

This guide applies to any project using Playwright Test with TypeScript and the Page Object Model. Follow every rule and pattern here. When adding to an existing project, match what already exists in `tests/ui/` and `src/pages/` before introducing new patterns.

---

## Stack

| Concern | Tool |
|---|---|
| Test runner (UI) | `@playwright/test` |
| Test runner (BDD) | `@cucumber/cucumber` + `playwright` |
| Language | TypeScript (strict mode) |
| Pattern | Page Object Model (POM) shared across both runners |
| Browser | Chromium (headless) |
| Base URL | Read from env config (`ENV.BASE_URL`) — never hard-coded |
| Config (UI) | `playwright.config.ts` — matches `tests/ui/**/*.spec.ts` |
| Config (BDD) | `cucumber.js` — matches `tests/bdd/features/**/*.feature` |

---

## Project structure

```
src/
  config/
    env.ts                         ← All env vars. Always import ENV from here. Never use process.env directly.
  api/
    ApiClient.ts                   ← Base HTTP client. Do not call fetch() in test or page files.
    [Domain]ApiClient.ts           ← One file per API domain.
  pages/
    BasePage.ts                    ← Shared locators and helpers. All page objects extend this.
    [PageName]Page.ts              ← One class per application route.
  utils/
    TestDataFactory.ts             ← All test data creation and cleanup. Never create data inline in tests.
  fixtures/
    fixtures.ts                    ← Extended Playwright test object. Always import test from here in spec files.

tests/
  ui/
    [feature].spec.ts              ← Playwright spec — one file per feature area.
  bdd/
    features/
      [feature].feature            ← Gherkin feature file — one file per feature area.
    step-definitions/
      [feature].steps.ts           ← Cucumber step definitions mapped to the feature file above.
    support/
      world.ts                     ← Cucumber World — browser lifecycle and shared context per scenario.
```

---

## Importing in spec files

Always import `test` and `expect` from the project's custom fixtures file, not from `@playwright/test` directly:

```typescript
import { test, expect } from '../../src/fixtures/fixtures'
```

The custom `test` object extends the Playwright base with project-specific fixtures. Importing from `@playwright/test` bypasses those fixtures.

---

## Fixture design

Fixtures provide pre-set state to tests — authenticated sessions, pre-created data, page object instances. Define them in `src/fixtures/fixtures.ts` using `test.extend()`.

Every project should define fixtures for these categories:

**Identity / auth:**
- A freshly created test user (unique per run, with credentials and a valid session token)
- An authenticated browser page (logged in as the test user via the real login form)
- A login-page object (for tests that specifically test authentication flows)

**Page objects:**
- One fixture per page object, built on top of the authenticated page
- The fixture provides the page object instance; the test calls `.goto()` when it needs to navigate

**Pre-seeded entity state:**
- One or more fixtures that create an entity via the API before the test runs
- Cleans up after the test in the fixture teardown (after `await use(...)`)

### Fixture template

```typescript
// In the fixtures type declaration:
featurePage: FeaturePage
seededEntity: EntityType

// In test.extend():
featurePage: async ({ authenticatedPage }, use) => {
  const page = new FeaturePage(authenticatedPage)
  await use(page)
  // No teardown needed — page state is isolated per test
},

seededEntity: async ({ testUser }, use) => {
  const factory = new TestDataFactory(ENV.API_URL)
  const entity = await factory.createEntity(testUser.token, { /* payload */ })
  await use(entity)
  await domainClient.delete(testUser.token, entity.id).catch(() => {})
},
```

**When to navigate inside a fixture vs inside the test:**
- The fixture should NOT navigate. Give the test a page object that is ready to use but not yet navigated. This lets the test control exactly when navigation happens.
- Exception: if the fixture's entire purpose is "user is on page X", navigate inside the fixture.

---

## Creating a new Page Object

Create one class per application route in `src/pages/[PageName]Page.ts`. All page objects extend `BasePage`.

### Template

```typescript
/**
 * Page Object for [Page Name] ([route path]).
 *
 * Describe the page's two or three distinct states and which selectors
 * identify each state. Note selector strategy decisions that are not obvious.
 */
import { Locator } from '@playwright/test'
import { BasePage } from './BasePage'

export class [PageName]Page extends BasePage {

  // ── Navigation ────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto('/route-path')
    await this.waitForPageLoad()
  }

  // ── Locators — expose as getters, never call locate inside action methods ─

  get pageHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Page Title' })
  }

  get primaryButton(): Locator {
    return this.page.getByRole('button', { name: 'Button Label' })
  }

  get fieldInput(): Locator {
    return this.page.getByLabel('Field Label')
  }

  get emptyStateMessage(): Locator {
    return this.page.getByText('Nothing here yet')
  }

  // For lists with per-item actions, expose a scoped row locator:
  itemRow(identifier: string): Locator {
    return this.page.locator('[data-testid="item-row"]').filter({ hasText: identifier })
  }

  actionButton(identifier: string): Locator {
    return this.itemRow(identifier).getByRole('button', { name: 'Action' })
  }

  // ── Actions — async, call locator methods inside ───────────────────────────

  async clickPrimaryButton(): Promise<void> {
    await this.primaryButton.click()
    await this.page.waitForLoadState('networkidle')  // only after API-triggering actions
  }

  async fillField(value: string): Promise<void> {
    await this.fieldInput.fill(value)
  }

  async performItemAction(identifier: string): Promise<void> {
    await this.actionButton(identifier).click()
    await this.page.waitForLoadState('networkidle')
  }

  // ── Data extraction ───────────────────────────────────────────────────────

  async getItemCount(): Promise<number> {
    return this.page.locator('[data-testid="item-row"]').count()
  }

  // ── State checks — return booleans, used in assertions in spec files ───────

  async isEmptyStateVisible(): Promise<boolean> {
    return this.emptyStateMessage.isVisible()
  }

  async isActionButtonDisabled(identifier: string): Promise<boolean> {
    return this.actionButton(identifier).isDisabled()
  }
}
```

### Rules for page objects

- **Locators are getters**, not async methods. `get someButton()` not `async someButton()`.
- **Actions are async methods** that call locator methods internally.
- **Never put `expect()` inside a page object.** Assertions belong in spec files only.
- **Never navigate inside an action method.** Navigation belongs in `goto()` or in the spec.
- **Scope locators** when the page has repeating rows. Use `.filter({ hasText: '...' })` to target a specific row, then chain further locators from it.
- If you need a new locator, add it to the page object — never write a raw locator inside a spec file.

---

## BasePage — what every page object inherits

Define shared application-level elements in `BasePage`. Every page inherits these. Common candidates:

```typescript
// Navigation elements shared across all pages (header, sidebar, nav links)
get navLink(): Locator { ... }

// Notification / toast shown after actions
get toast(): Locator { ... }
async getToastMessage(): Promise<string> {
  await this.toast.waitFor({ state: 'visible' })
  return (await this.toast.textContent()) ?? ''
}

// Shared counter badge (e.g. item count in header)
async getBadgeCount(): Promise<number> { ... }

// Navigation helper
async goto(path: string): Promise<void> {
  await this.page.goto(path)
}

// Load wait
async waitForPageLoad(): Promise<void> {
  await this.page.waitForLoadState('domcontentloaded')
}
```

Only put locators in `BasePage` that appear on **every** page (or nearly every page). Feature-specific locators belong in feature page objects.

---

## Selector strategy — priority order

Choose the highest-priority selector that works. Never skip a higher-priority option because a lower-priority one is easier to write.

| Priority | Method | When to use |
|---|---|---|
| 1 | `getByRole('button', { name: 'Submit' })` | Buttons, links, headings, inputs with accessible names |
| 2 | `getByLabel('Email')` | Form inputs associated with a `<label>` |
| 3 | `getByText('Exact text')` | Static visible text — paragraphs, status messages, labels |
| 4 | `getByPlaceholder('Search…')` | Inputs with no label, identified by placeholder only |
| 5 | `locator('[data-testid="..."]')` | When the dev team has added explicit test identifiers |
| 6 | `locator('[class*="..."]')` | Last resort — class-based, always scoped to a container |

**Never use:**
- XPath
- `:nth-child()` or `:first-child` CSS pseudo-selectors without a scoped container
- Absolute CSS paths (`.wrapper > div > button`)
- `.nth(N)` without first narrowing to a scoped container

**When multiple elements match the same selector**, scope to a parent container first:

```typescript
// Wrong — ambiguous when multiple rows exist
this.page.getByRole('button', { name: 'Delete' })

// Correct — scoped to a specific row
this.itemRow(identifier).getByRole('button', { name: 'Delete' })
```

---

## How to discover selectors from source code

When writing selectors, read the actual component source to find stable attributes. Follow this order:

1. Check if the element has a `data-testid` → use `locator('[data-testid="..."]')`
2. Check for an ARIA role + accessible name → use `getByRole()`
3. Check for a `<label>` associated with the element → use `getByLabel()`
4. Check the element's own visible text content → use `getByText()` or `getByRole()` with `name:`
5. Last resort — identify a stable class combination → `locator('[class*="..."]')`

When using class-based selectors, prefer classes that describe **structure or purpose** (`card`, `row`, `panel`) over visual decoration (`hover:shadow`, `transition-all`). Structural classes are far more stable across design iterations.

---

## Creating a new spec file

```typescript
/**
 * UI tests for [Feature Name].
 *
 * Covers: [brief list of what is tested]
 * Prerequisites: Application must be running at BASE_URL.
 */
import { test, expect } from '../../src/fixtures/fixtures'

test.describe('[Feature] — [Category]', () => {

  test('[action verb] [expected result]', async ({ featurePage }) => {
    // Arrange: navigate or use a fixture for pre-set state
    await featurePage.goto()
    // Act
    await featurePage.clickPrimaryButton()
    // Assert
    await expect(featurePage.confirmationMessage).toBeVisible()
  })

})

test.describe('[Feature] — [Another Category]', () => {

  test('[action] [outcome]', async ({ featurePage, seededEntity }) => {
    await featurePage.goto()
    expect(await featurePage.isItemVisible(seededEntity.name)).toBe(true)
  })

})
```

### Test name convention

```
describe: '[Feature] — [Category]'
test:     '[action verb] [expected result]'

Good:
  'redirects unauthenticated user to login when accessing a protected route'
  'shows empty state message when no items exist'
  'updates displayed total after quantity is changed'
  'disables the decrease button when quantity is at minimum'
  'navigates to confirmation page after form is submitted'

Bad:
  'test feature'
  'it works'
  'check quantity'
```

---

## Test data — rules

**Never hard-code IDs, emails, passwords, names, or any entity values** in test files. These change between environments.

Use `TestDataFactory` for all data setup:

```typescript
import { TestDataFactory } from '../../src/utils/TestDataFactory'
import { ENV } from '../../src/config/env'

const factory = new TestDataFactory(ENV.API_URL)

// Create a unique user — timestamp-based email, safe across parallel runs
const user = await factory.createTestUser()

// Fetch a real entity — never assume an ID exists
const entity = await factory.getFirstAvailableEntity()

// Seed state via API before the test touches the UI
await factory.seedEntity(user.token, entity.id)
```

**Seed via API, not via UI**, unless the test is specifically validating the creation flow. API seeding is faster and keeps the test focused on the feature under test.

---

## Authentication

**Always authenticate by navigating through the application's login form.** Do not bypass auth by setting `localStorage` or `sessionStorage` directly — this skips the real session setup and may miss side effects.

```typescript
// Correct — exercises the real auth flow
test('example', async ({ authenticatedPage }) => {
  // page is already logged in via the login form
})

// Wrong — bypasses auth, may miss session setup
await page.evaluate((t) => localStorage.setItem('auth_token', t), token)
```

For tests that verify unauthenticated behaviour, use the plain `page` fixture (from `@playwright/test`), not `authenticatedPage`:

```typescript
test('redirects to login when not authenticated', async ({ page }) => {
  await page.goto('/protected-route')
  await expect(page).toHaveURL(/\/login/)
})
```

---

## Assertions

```typescript
// Visibility
await expect(locator).toBeVisible()
await expect(locator).toBeHidden()

// URL after navigation
await expect(page).toHaveURL('/exact-path')
await expect(page).toHaveURL(/\/partial-match/)

// Text content
await expect(locator).toHaveText('Exact text')
await expect(locator).toContainText('partial')

// Counts
expect(await featurePage.getItemCount()).toBe(3)

// Monetary or floating-point values — always use toBeCloseTo, never toBe
expect(await featurePage.getDisplayedTotal()).toBeCloseTo(price * qty, 2)

// Boolean state helpers
expect(await featurePage.isActionButtonDisabled(identifier)).toBe(true)

// Disabled state directly on a locator
await expect(locator).toBeDisabled()
await expect(locator).toBeEnabled()
```

---

## Waiting strategy

**Never use `page.waitForTimeout(ms)`.** It makes tests slow and introduces arbitrary coupling to timing.

| Situation | Correct approach |
|---|---|
| After navigation | `await page.waitForURL('/expected-path')` |
| Element should appear | `await expect(locator).toBeVisible()` — Playwright auto-waits |
| After a button click that calls an API | `await page.waitForLoadState('networkidle')` |
| Toast / notification | Call `getToastMessage()` which internally waits for visibility |
| DOM value updated by async state | `await page.waitForFunction(() => /* DOM condition */)` |
| Initial page load | `await this.waitForPageLoad()` (calls `waitForLoadState('domcontentloaded')`) |

---

## Cleanup

Use `afterEach` to clean up state created during a test. Use the API client directly — faster than UI navigation:

```typescript
test.afterEach(async ({ testUser }) => {
  const client = new DomainApiClient(ENV.API_URL, testUser.token)
  await client.deleteAll().catch(() => {})  // catch prevents cleanup errors masking test failures
})
```

When state is created by a fixture, put the cleanup inside the fixture's teardown (after `await use(...)`):

```typescript
seededEntity: async ({ testUser }, use) => {
  const entity = await factory.createEntity(testUser.token, payload)
  await use(entity)
  await factory.deleteEntity(testUser.token, entity.id).catch(() => {})
},
```

---

## Common patterns

### Empty / zero state

```typescript
test('shows empty state when no items exist', async ({ featurePage }) => {
  await featurePage.goto()
  await expect(featurePage.emptyStateMessage).toBeVisible()
  await expect(featurePage.primaryButton).toBeHidden()
})
```

### Form submission with validation

```typescript
test('shows error message on invalid input', async ({ featurePage }) => {
  await featurePage.goto()
  await featurePage.fillField('')
  await featurePage.submitForm()
  const error = await featurePage.getErrorMessage()
  expect(error).toContain('required')
})
```

### DOM value updated by async state change

```typescript
test('badge count updates after action', async ({ featurePage }) => {
  const before = await featurePage.getBadgeCount()
  await featurePage.performAction()
  await featurePage.page.waitForFunction(
    (prev) => {
      const badge = document.querySelector('[data-testid="count-badge"]')
      return badge ? parseInt(badge.textContent || '0') > prev : false
    },
    before,
    { timeout: 5000 },
  )
  expect(await featurePage.getBadgeCount()).toBeGreaterThan(before)
})
```

### Seeded state used in a test

```typescript
test('shows seeded item in the list', async ({ featurePage, seededEntity }) => {
  await featurePage.goto()
  await expect(featurePage.itemRow(seededEntity.name)).toBeVisible()
})
```

---

## BDD with Cucumber

BDD (Behaviour-Driven Development) tests use Gherkin syntax written in `.feature` files and executed by Cucumber. They share the same page objects as the Playwright spec files — the difference is in the runner, not the automation code.

### When to write a feature file vs a spec file

| Use `.feature` + Cucumber | Use `.spec.ts` + Playwright |
|---|---|
| Scenarios that business stakeholders read or approve | Implementation-level edge cases |
| Acceptance criteria from user stories | Component states (empty, loading, error) |
| End-to-end happy paths and key negative paths | Fine-grained interaction tests |

A feature file should read like a business requirement. A spec file should read like a technical contract.

---

### Creating a new feature file

Place it in `tests/bdd/features/[feature].feature`.

```gherkin
Feature: [Feature Name]
  As a [type of user]
  I want to [goal]
  So that [reason / benefit]

  Background:
    Given I am logged in as a registered user

  Scenario: [What the user is doing — present tense, business language]
    Given [precondition]
    When [action the user takes]
    Then [expected outcome]

  Scenario: [Another scenario]
    Given [precondition]
    And [additional precondition]
    When [action]
    Then [outcome]
    And [additional outcome]
```

**Gherkin rules:**
- Use present tense: "I click", not "I clicked"
- One action per `When` step — split complex flows into multiple steps
- `Then` steps describe observable outcomes — what the user sees, not what the system did internally
- `Background` runs before every scenario in the file — use it only for universal preconditions (e.g. login)
- Parameterise steps with `{string}` or `{int}` when the same step applies to multiple values
- Do not hard-code entity names or IDs in Gherkin steps — seed data via `Given` steps and reference it with "that product" / "that item"

---

### Creating step definitions

Place them in `tests/bdd/step-definitions/[feature].steps.ts`. One file per feature file.

```typescript
/**
 * Step definitions for the [Feature] feature.
 *
 * Given → sets up preconditions (auth, seeded data)
 * When  → performs user actions (navigate, click, fill)
 * Then  → asserts outcomes (visible text, URLs, state)
 *
 * Steps receive the World instance as `this`, giving access to the browser
 * page, all page objects, and shared test data (testUser, seededEntity).
 */
import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { AppWorld } from '../support/world'
import { TestDataFactory } from '../../../src/utils/TestDataFactory'
import { ENV } from '../../../src/config/env'

// ── Given — set up preconditions ──────────────────────────────────────────────

Given('I am logged in as a registered user', async function (this: AppWorld) {
  const factory = new TestDataFactory(ENV.API_URL)
  this.testUser = await factory.createTestUser()
  await this.loginPage.goto()
  await this.loginPage.loginAndWait(this.testUser.email, this.testUser.password)
})

Given('I am not logged in', async function (this: AppWorld) {
  await this.page.context().clearCookies()
  // Also clear storage if the app uses localStorage / sessionStorage for auth
})

Given('I have a [entity] in my [context]', async function (this: AppWorld) {
  if (!this.testUser) throw new Error('testUser not set — run login step first')
  const factory = new TestDataFactory(ENV.API_URL)
  this.seededEntity = await factory.getFirstAvailableEntity()
  await factory.seedEntityForUser(this.testUser.token, this.seededEntity.id)
})

// ── When — perform user actions ───────────────────────────────────────────────

When('I navigate to the [feature] page', async function (this: AppWorld) {
  await this.featurePage.goto()
})

When('I click {string}', async function (this: AppWorld, label: string) {
  // Route to specific page object methods by label — avoid raw locators here
  await this.page.getByRole('button', { name: label })
    .or(this.page.getByRole('link', { name: label }))
    .first()
    .click()
})

// ── Then — assert outcomes ─────────────────────────────────────────────────────

Then('I should see {string}', async function (this: AppWorld, text: string) {
  await expect(this.page.getByText(text)).toBeVisible()
})

Then('I should see the {string} heading', async function (this: AppWorld, heading: string) {
  await expect(this.page.getByRole('heading', { name: heading })).toBeVisible()
})

Then('I should be redirected to the login page', async function (this: AppWorld) {
  await expect(this.page).toHaveURL(/\/login/)
})
```

**Step definition rules:**
- `Given` steps set state — create users, seed data, navigate to a starting point
- `When` steps perform one action — click, fill, submit
- `Then` steps assert — call `expect()`. Never navigate or mutate state in a `Then` step
- Always check `this.testUser` / `this.seededEntity` are set before using them — throw a clear error if not
- Route named-button clicks (`I click {string}`) through page object methods, not raw locators
- Parameterised steps use Cucumber expressions: `{string}` for quoted strings, `{int}` for integers

---

### Creating the World class

Place it in `tests/bdd/support/world.ts`. One World class shared by all feature files.

```typescript
/**
 * Cucumber World — shared context for all BDD scenarios.
 *
 * A fresh World instance is created for each scenario, giving every scenario
 * its own isolated browser session. Steps receive `this` as the World instance.
 *
 * Browser lifecycle:
 *   Before hook — launch browser, create context + page, initialise page objects
 *   After hook  — clean up seeded state, close browser
 */
import { setWorldConstructor, World, IWorldOptions, Before, After } from '@cucumber/cucumber'
import { Browser, BrowserContext, Page, chromium } from 'playwright'
import { LoginPage } from '../../../src/pages/LoginPage'
import { [Feature]Page } from '../../../src/pages/[Feature]Page'
import { TestDataFactory, TestUser } from '../../../src/utils/TestDataFactory'
import { ENV } from '../../../src/config/env'

export class AppWorld extends World {
  // ── Browser ───────────────────────────────────────────────────────────────
  browser!: Browser
  context!: BrowserContext
  page!: Page

  // ── Shared test data ──────────────────────────────────────────────────────
  testUser?: TestUser
  seededEntity?: EntityType   // type from the domain's API client

  // ── Page objects ──────────────────────────────────────────────────────────
  loginPage!: LoginPage
  featurePage!: [Feature]Page
  // add one property per page object the step definitions need

  constructor(options: IWorldOptions) {
    super(options)
  }

  async initPages(): Promise<void> {
    this.loginPage = new LoginPage(this.page)
    this.featurePage = new [Feature]Page(this.page)
  }
}

setWorldConstructor(AppWorld)

Before(async function (this: AppWorld) {
  this.browser = await chromium.launch({ headless: true })
  this.context = await this.browser.newContext({ baseURL: ENV.BASE_URL })
  this.page = await this.context.newPage()
  await this.initPages()
})

After(async function (this: AppWorld) {
  // Clean up seeded state — best-effort, swallow errors so test result is preserved
  if (this.testUser && this.seededEntity) {
    try {
      const factory = new TestDataFactory(ENV.API_URL)
      await factory.deleteEntityForUser(this.testUser.token, this.seededEntity.id)
    } catch { /* swallow */ }
  }
  await this.page?.close()
  await this.context?.close()
  await this.browser?.close()
})
```

**World rules:**
- One World class for the whole project — all features share it
- Declare every page object as a property with `!` (definite assignment, set in `initPages()`)
- Shared test data (`testUser`, `seededEntity`) uses `?` — not every scenario will set them
- Always clean up in `After`, never in `Then` steps — cleanup is infrastructure, not behaviour
- The `After` hook runs even when a scenario fails — wrap cleanup in `try/catch`

---

## Anti-patterns — never do these

```typescript
// ✗ Raw locator inside a spec file — belongs in a page object
await page.locator('button.primary').click()

// ✗ Hard-coded entity ID
const entity = await factory.getEntity(42)

// ✗ Manual sleep
await page.waitForTimeout(2000)

// ✗ Importing from @playwright/test in a spec file
import { test } from '@playwright/test'

// ✗ Assertion inside a page object
async clickAndVerify() {
  await this.button.click()
  expect(await this.result.textContent()).toBe('done')  // wrong place
}

// ✗ Navigation inside an action method
async clickSave() {
  await this.saveButton.click()
  await this.page.waitForURL('/success')  // test's responsibility, not page object's
}

// ✗ Bypassing auth with localStorage
await page.evaluate((t) => localStorage.setItem('token', t), token)

// ✗ Test depending on a previous test having run
// Always set up preconditions in beforeEach or a fixture — never in another test
```

---

## Adding a new fixture

When multiple tests share the same setup, add a fixture to `src/fixtures/fixtures.ts`:

```typescript
// Add to the project fixtures type:
seededItem: ItemType

// Add to test.extend():
seededItem: async ({ testUser }, use) => {
  const factory = new TestDataFactory(ENV.API_URL)
  const item = await factory.createItem(testUser.token, { /* payload */ })
  await use(item)
  await factory.deleteItem(testUser.token, item.id).catch(() => {})
},
```

---

## data-testid recommendations

Request the development team add `data-testid` attributes to elements that are hard to select reliably:

- Notification / toast containers and their message text
- Repeating rows in lists, tables, or grids
- Count badges in navigation or headers
- Page-level success or error banners
- Modal dialogs and their action buttons

Until added, use the next best selector from the priority matrix, scoped to the narrowest available container.
