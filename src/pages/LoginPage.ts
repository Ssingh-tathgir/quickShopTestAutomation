import { Page, Locator } from '@playwright/test'
import { BasePage } from './BasePage'

export class LoginPage extends BasePage {
  private get emailInput(): Locator {
    return this.page.getByLabel('Email')
  }

  private get passwordInput(): Locator {
    return this.page.getByLabel('Password')
  }

  private get signInButton(): Locator {
    return this.page.getByRole('button', { name: 'Sign In' })
  }

  get errorBanner(): Locator {
    return this.page.locator('[class*="bg-red-50"][class*="border-red-200"]')
  }

  get successBanner(): Locator {
    return this.page.locator('[class*="bg-green-50"][class*="border-green-200"]')
  }

  async goto(): Promise<void> {
    await this.page.goto('/auth/login')
    await this.waitForPageLoad()
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.signInButton.click()
  }

  async loginAndWait(email: string, password: string): Promise<void> {
    await this.login(email, password)
    await this.page.waitForURL('/')
  }

  async getErrorMessage(): Promise<string> {
    await this.errorBanner.waitFor({ state: 'visible', timeout: 5000 })
    return (await this.errorBanner.textContent()) || ''
  }

  async isSignInButtonDisabled(): Promise<boolean> {
    return this.signInButton.isDisabled()
  }
}
