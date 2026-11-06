import type { ApiErrorBody } from './types'

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
export const API_BASE_URL = (configuredBaseUrl || '/api/v1').replace(/\/$/, '')

let csrfToken: string | null = null

export class ApiError extends Error {
  readonly status: number
  readonly body: ApiErrorBody | null

  constructor(status: number, body: ApiErrorBody | null) {
    super(body?.detail || `Request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

function isUnsafeMethod(method: string) {
  return !['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method.toUpperCase())
}

async function parseResponseBody(response: Response): Promise<ApiErrorBody | null> {
  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return null

  return (await response.json()) as ApiErrorBody
}

export async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken

  const response = await fetch(`${API_BASE_URL}/auth/csrf/`, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })

  const body = (await response.json()) as { csrfToken?: string }
  if (!response.ok || !body.csrfToken) {
    throw new ApiError(response.status, { detail: 'Unable to initialize CSRF protection.' })
  }

  csrfToken = body.csrfToken
  return csrfToken
}

export function clearCsrfToken() {
  csrfToken = null
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase()
  const headers = new Headers(options.headers)

  headers.set('Accept', 'application/json')

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (isUnsafeMethod(method)) {
    headers.set('X-CSRFToken', await getCsrfToken())
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method,
    credentials: 'include',
    headers,
  })

  const body = await parseResponseBody(response)

  if (!response.ok) {
    throw new ApiError(response.status, body)
  }

  return body as T
}

export function firstFieldError(error: unknown, field: string): string | null {
  if (!(error instanceof ApiError) || !error.body) return null

  const value = error.body[field]
  if (Array.isArray(value)) return value[0] || null
  if (typeof value === 'string') return value
  return null
}
