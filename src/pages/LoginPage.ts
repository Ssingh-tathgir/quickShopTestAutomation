/**
 * Page Object for the Login page (/auth/login).
 *
 * Encapsulates all interactions with the login form:
 *   - Filling email and password fields
 *   - Clicking the Sign In button
 *   - Reading success and error banner messages
 *
 * Selector strategy:
 *   - Inputs use getByLabel() which matches the visible <label> text —
 *     this is the most resilient approach and mirrors how a real user finds fields.
 *   - The submit button uses getByRole('button') with its accessible name.
 *   - Banners use class-based selectors as they have no accessible role or label.
 */
import { Page, Locator } from '@playwright/test'
import { BasePage } from './BasePage'

export class LoginPage extends BasePage {
  // ── Form elements ─────────────────────────────────────────────────────────

  /** Email input — matched via the "Email" <label> element above it. */
  private get emailInput(): Locator {
    return this.page.getByLabel('Email')
  }

  /** Password input — matched via the "Password" <label> element above it. */
  private get passwordInput(): Locator {
    return this.page.getByLabel('Password')
  }

  /** The primary form submission button. Becomes disabled while the login request is in flight. */
  private get signInButton(): Locator {
    return this.page.getByRole('button', { name: 'Sign In' })
  }

  // ── Feedback banners ──────────────────────────────────────────────────────

  /**
   * The red error banner shown when login fails (wrong credentials, server error).
   * Identified by Tailwind classes bg-red-50 and border-red-200.
   */
  get errorBanner(): Locator {
    return this.page.locator('[class*="bg-red-50"][class*="border-red-200"]')
  }

  /**
   * The green success banner shown after a successful registration redirect
   * (the page receives a ?registered query param and displays a confirmation).
   */
  get successBanner(): Locator {
    return this.page.locator('[class*="bg-green-50"][class*="border-green-200"]')
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  /** Navigates to the login page and waits for DOM to be ready. */
  async goto(): Promise<void> {
    await this.page.goto('/auth/login')
    await this.waitForPageLoad()
  }

  /**
   * Fills the email and password fields and clicks Sign In.
   * Does NOT wait for navigation — use loginAndWait() when the test
   * needs to confirm the redirect to the home page has completed.
   */
  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.signInButton.click()
  }

  /**
   * Fills credentials, clicks Sign In, and waits until the browser has
   * navigated to the home page ('/').
   * Use this in fixtures and Before hooks to set up an authenticated session.
   */
  async loginAndWait(email: string, password: string): Promise<void> {
    await this.login(email, password)
    await this.page.waitForURL('/')
  }

  /** Waits for the error banner to appear and returns its text. */
  async getErrorMessage(): Promise<string> {
    await this.errorBanner.waitFor({ state: 'visible', timeout: 5000 })
    return (await this.errorBanner.textContent()) || ''
  }

  /** Returns true if the Sign In button is currently disabled (mid-request). */
  async isSignInButtonDisabled(): Promise<boolean> {
    return this.signInButton.isDisabled()
  }
}
