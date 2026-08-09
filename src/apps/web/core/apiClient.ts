import { ApiError, extractErrorMessage } from './utils/apiError'
import { getAppConfig } from './appConfig'
import { storage } from './utils/storage'

type OnUnauthorized = () => void

let onUnauthorized: OnUnauthorized | null = null

export function setUnauthorizedHandler(handler: OnUnauthorized): void {
  onUnauthorized = handler
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value))
    }
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { params?: Record<string, string | number | boolean | undefined> } = {},
): Promise<T> {
  const { params, ...init } = options
  const baseUrl = getAppConfig().apiBaseUrl
  const url = `${baseUrl}${path}${params ? buildQuery(params) : ''}`

  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }

  const token = storage.getItem('token')
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let response: Response
  try {
    response = await fetch(url, { ...init, headers })
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0)
  }

  const isLogin = path.includes('/auth/signin')
  let body: unknown = null
  const text = await response.text()
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !isLogin) {
      onUnauthorized?.()
    }
    throw new ApiError(extractErrorMessage(response.status, body, response.statusText), response.status, body)
  }

  return body as T
}

/** Multipart upload — do not set Content-Type (browser sets boundary). */
export async function apiFormRequest<T>(
  path: string,
  formData: FormData,
  options: { params?: Record<string, string | number | boolean | undefined>; method?: string } = {},
): Promise<T> {
  const baseUrl = getAppConfig().apiBaseUrl
  const url = `${baseUrl}${path}${options.params ? buildQuery(options.params) : ''}`
  const headers = new Headers()
  const token = storage.getItem('token')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(url, {
      method: options.method ?? 'POST',
      headers,
      body: formData,
    })
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0)
  }

  let body: unknown = null
  const text = await response.text()
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }

  if (!response.ok) {
    if (response.status === 401) onUnauthorized?.()
    throw new ApiError(extractErrorMessage(response.status, body, response.statusText), response.status, body)
  }

  return body as T
}
