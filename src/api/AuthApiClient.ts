/**
 * API client for QuickShop authentication endpoints.
 *
 * Covers:
 *   POST /auth/register  — create a new user account
 *   POST /auth/login     — authenticate and receive a JWT access token
 *   GET  /auth/me        — fetch the currently authenticated user's profile
 *
 * The JWT token returned by login() must be passed to CartApiClient and other
 * authenticated clients. It is stored as 'qs_token' in localStorage by the
 * frontend, but in tests we use it directly via the Authorization header.
 */
import { ApiClient, ApiResult } from './ApiClient'

/** Shape of a QuickShop user returned by the API. */
export interface User {
  id: number
  first_name: string
  last_name: string
  email: string
}

/** Shape of the login response — contains the JWT token and the logged-in user. */
export interface TokenResponse {
  access_token: string  // JWT token to pass as Bearer in subsequent requests
  token_type: string    // Always "bearer"
  user: User
}

/** Payload required to register a new user account. */
export interface RegisterRequest {
  first_name: string
  last_name: string
  email: string
  password: string
  confirm_password: string  // Must match password — validated server-side
}

export class AuthApiClient {
  private readonly client: ApiClient

  constructor(baseUrl: string, token?: string) {
    this.client = new ApiClient(baseUrl, token)
  }

  /**
   * Authenticates a user with email and password.
   * On success, returns a JWT access_token that authorises all subsequent requests.
   */
  login(email: string, password: string): Promise<ApiResult<TokenResponse>> {
    return this.client.post<TokenResponse>('/auth/login', { email, password })
  }

  /**
   * Registers a new user account.
   * Returns the created user without a token — login() must be called separately.
   */
  register(data: RegisterRequest): Promise<ApiResult<User>> {
    return this.client.post<User>('/auth/register', data)
  }

  /**
   * Fetches the profile of the currently authenticated user.
   * Useful for verifying that a token is still valid.
   */
  getMe(token: string): Promise<ApiResult<User>> {
    return this.client.withToken(token).get<User>('/auth/me')
  }
}
