export class ApiError extends Error {
  readonly status: number
  readonly raw?: unknown

  constructor(message: string, status: number, raw?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.raw = raw
  }
}

function formatDetail(detail: unknown): string | null {
  if (typeof detail === 'string' && detail.trim()) {
    return detail
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (item && typeof item === 'object' && 'msg' in item) {
          const msg = (item as { msg?: unknown }).msg
          return typeof msg === 'string' ? msg : null
        }
        return null
      })
      .filter((msg): msg is string => !!msg)

    if (messages.length > 0) {
      return messages.join('. ')
    }
  }

  return null
}

export function extractErrorMessage(status: number, body: unknown, statusText?: string): string {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>
    const detailMessage = formatDetail(record.detail)
    if (detailMessage) {
      return detailMessage
    }
    if (typeof record.message === 'string' && record.message.trim()) {
      return record.message
    }
    const data = record.data as Record<string, unknown> | undefined
    if (data && typeof data.message === 'string') {
      return data.message
    }
  }

  if (status === 0) {
    return 'Could not reach the server. Check your connection and try again.'
  }

  return statusText || `Request failed with status ${status}`
}
