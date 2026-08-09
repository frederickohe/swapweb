import { useEffect, useState } from 'react'
import { ScreenTopBar } from '../components/ScreenTopBar'
import type { AppNotification } from '../core/models'
import { notificationsApi } from '../core/services'
import { ApiError } from '../core/utils/apiError'

function formatWhen(value: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString()
}

export function NotificationsPage() {
  const [items, setItems] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [marking, setMarking] = useState<Set<string>>(new Set())

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await notificationsApi.list({ status: 'UNREAD' })
      setItems(rows.filter((n) => !n.read))
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Failed to load notifications',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const markRead = async (id: string) => {
    if (marking.has(id)) return
    setMarking((prev) => new Set(prev).add(id))
    try {
      await notificationsApi.markRead(id)
      setItems((prev) => prev.filter((n) => n.id !== id))
    } catch {
      // keep item visible
    } finally {
      setMarking((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  return (
    <div className="settings-subpage">
      <ScreenTopBar title="Notifications" showAvatar={false} />

      {loading && (
        <div className="loading-state">
          <i className="ri-loader-4-line spin" aria-hidden />
          <p>Loading…</p>
        </div>
      )}

      {!loading && error && <div className="error-state">{error}</div>}

      {!loading && !error && items.length === 0 && (
        <div className="empty-state">
          <p>No notifications yet</p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="notif-list">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="notif-item"
              disabled={marking.has(item.id)}
              onClick={() => void markRead(item.id)}
            >
              <span className="notif-item-dot" aria-hidden />
              <span className="notif-item-body">
                <strong>{item.title}</strong>
                {item.body ? <span>{item.body}</span> : null}
                {item.createdAt ? (
                  <small>{formatWhen(item.createdAt)}</small>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
