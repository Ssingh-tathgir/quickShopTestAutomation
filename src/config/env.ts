import * as dotenv from 'dotenv'
dotenv.config()

export const ENV = {
  BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
  API_URL: process.env.API_URL || 'http://localhost:8002',
  TEST_USER_PASSWORD: process.env.TEST_USER_PASSWORD || 'Test@12345',
} as const
