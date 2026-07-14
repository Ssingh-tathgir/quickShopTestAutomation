/**
 * Playwright configuration for QuickShop automation.
 *
 * Two test projects are defined:
 *   - chromium: runs all UI tests in a real browser (tests/ui/)
 *   - api:      runs all API tests without a browser (tests/api/)
 *
 * Environment variables are loaded from .env at startup so BASE_URL and
 * API_URL can be overridden per environment without changing code.
 */
import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'
dotenv.config()

export default defineConfig({
  // Root folder where Playwright searches for test files
  testDir: './tests',

  // Run tests sequentially (workers: 1) to avoid cart state conflicts
  // between tests that share the same backend database
  fullyParallel: false,
  workers: 1,

  // Retry failed tests once locally, twice in CI pipelines
  retries: process.env.CI ? 2 : 1,

  reporter: [
    // HTML report saved to reports/playwright/ — open with: npx playwright show-report
    ['html', { open: 'never', outputFolder: 'reports/playwright' }],
    // Line reporter prints one line per test in the terminal during the run
    ['line'],
  ],

  use: {
    // Frontend base URL — all page.goto('/path') calls are relative to this
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    // Capture a Playwright trace on the first retry to help diagnose failures
    trace: 'on-first-retry',
    // Save a screenshot only when a test fails
    screenshot: 'only-on-failure',
    // Record a video only on the first retry of a failed test
    video: 'on-first-retry',
  },

  projects: [
    {
      // UI project: launches a real Chromium browser and navigates the frontend
      name: 'chromium',
      testMatch: ['tests/ui/**/*.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // API project: no browser — makes HTTP requests directly to the backend
      // baseURL is overridden here to point at the API server, not the frontend
      name: 'api',
      testMatch: ['tests/api/**/*.spec.ts'],
      use: { baseURL: process.env.API_URL || 'http://localhost:8002' },
    },
  ],
})
