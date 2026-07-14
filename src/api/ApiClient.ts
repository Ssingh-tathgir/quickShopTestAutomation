export interface ApiResult<T> {
  data: T
  status: number
  ok: boolean
}

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token?: string,
  ) {}

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.token) h['Authorization'] = `Bearer ${this.token}`
    return h
  }

  private async parseResponse<T>(res: Response): Promise<ApiResult<T>> {
    const data = res.status !== 204 ? await res.json().catch(() => null) : null
    return { data: data as T, status: res.status, ok: res.ok }
  }

  async get<T>(path: string): Promise<ApiResult<T>> {
    const res = await fetch(`${this.baseUrl}${path}`, { headers: this.headers() })
    return this.parseResponse<T>(res)
  }

  async post<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    return this.parseResponse<T>(res)
  }

  async put<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    return this.parseResponse<T>(res)
  }

  async delete<T>(path: string): Promise<ApiResult<T>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers(),
    })
    return this.parseResponse<T>(res)
  }

  withToken(token: string): ApiClient {
    return new ApiClient(this.baseUrl, token)
  }
}
