/**
 * Base HTTP client used by all domain-specific API clients.
 *
 * Wraps the native fetch API with:
 *   - Automatic JSON Content-Type header on every request
 *   - Optional Bearer token injection for authenticated endpoints
 *   - Consistent response shape: { data, status, ok } so callers can
 *     check success without catching exceptions
 *
 * Domain clients (AuthApiClient, CartApiClient, etc.) extend this by
 * composing it — they hold a private ApiClient instance and call its methods.
 * This keeps HTTP mechanics in one place and domain logic in each client.
 */

/** Uniform return type for every API call. */
export interface ApiResult<T> {
  data: T       // Parsed JSON body (null for 204 No Content responses)
  status: number // Raw HTTP status code, e.g. 200, 201, 400, 401, 404
  ok: boolean   // true when status is in the 200–299 range
}

export class ApiClient {
  /**
   * @param baseUrl  Root URL of the API, e.g. "http://localhost:8002"
   * @param token    Optional JWT Bearer token — included in Authorization header when present
   */
  constructor(
    private readonly baseUrl: string,
    private readonly token?: string,
  ) {}

  /** Builds request headers, adding the Authorization header only when a token is set. */
  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.token) h['Authorization'] = `Bearer ${this.token}`
    return h
  }

  /**
   * Parses a fetch Response into the standard ApiResult shape.
   * 204 No Content responses have no body, so data is set to null.
   */
  private async parseResponse<T>(res: Response): Promise<ApiResult<T>> {
    const data = res.status !== 204 ? await res.json().catch(() => null) : null
    return { data: data as T, status: res.status, ok: res.ok }
  }

  /** GET request — typically used to retrieve a resource. */
  async get<T>(path: string): Promise<ApiResult<T>> {
    const res = await fetch(`${this.baseUrl}${path}`, { headers: this.headers() })
    return this.parseResponse<T>(res)
  }

  /** POST request — used to create a resource or trigger an action (e.g. login, add to cart). */
  async post<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    return this.parseResponse<T>(res)
  }

  /** PUT request — used to update an existing resource (e.g. update cart item quantity). */
  async put<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    return this.parseResponse<T>(res)
  }

  /** DELETE request — used to remove a resource (e.g. remove cart item). */
  async delete<T>(path: string): Promise<ApiResult<T>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers(),
    })
    return this.parseResponse<T>(res)
  }

  /**
   * Returns a new ApiClient instance with the given token attached.
   * Used when a single client needs to make both authenticated and
   * unauthenticated calls, e.g. AuthApiClient.getMe().
   */
  withToken(token: string): ApiClient {
    return new ApiClient(this.baseUrl, token)
  }
}
