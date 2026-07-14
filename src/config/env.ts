/**
 * Central place for all environment-specific configuration.
 *
 * Values are read from environment variables at runtime, with sensible
 * defaults for local development. Override them by creating a .env file
 * (copy .env.example) or by setting the variables in your CI environment.
 *
 * Import this object wherever a URL or credential is needed — never hard-code
 * these values directly in test files.
 */
import * as dotenv from 'dotenv'
dotenv.config()

export const ENV = {
  // Base URL of the Next.js frontend — used by Playwright for all UI tests
  BASE_URL: process.env.BASE_URL || 'http://localhost:3000',

  // Base URL of the FastAPI backend — used by API clients and TestDataFactory
  API_URL: process.env.API_URL || 'http://localhost:8002',

  // Password used when creating temporary test users via the registration API.
  // All generated test accounts share this password for simplicity.
  TEST_USER_PASSWORD: process.env.TEST_USER_PASSWORD || 'Test@12345',
} as const
