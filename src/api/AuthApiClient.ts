import { ApiClient, ApiResult } from './ApiClient'

export interface User {
  id: number
  first_name: string
  last_name: string
  email: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

export interface RegisterRequest {
  first_name: string
  last_name: string
  email: string
  password: string
  confirm_password: string
}

export class AuthApiClient {
  private readonly client: ApiClient

  constructor(baseUrl: string, token?: string) {
    this.client = new ApiClient(baseUrl, token)
  }

  login(email: string, password: string): Promise<ApiResult<TokenResponse>> {
    return this.client.post<TokenResponse>('/auth/login', { email, password })
  }

  register(data: RegisterRequest): Promise<ApiResult<User>> {
    return this.client.post<User>('/auth/register', data)
  }

  getMe(token: string): Promise<ApiResult<User>> {
    return this.client.withToken(token).get<User>('/auth/me')
  }
}
