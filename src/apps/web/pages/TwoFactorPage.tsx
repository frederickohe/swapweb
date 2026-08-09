import { useState } from 'react'
import { ScreenTopBar } from '../components/ScreenTopBar'

export function TwoFactorPage() {
  const [enabled, setEnabled] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const toggle = () => {
    const next = !enabled
    setEnabled(next)
    setToast(
      next
        ? 'Two-factor authentication will be available soon'
        : 'Two-factor authentication disabled',
    )
    window.setTimeout(() => setToast(null), 2400)
  }

  return (
    <div className="settings-subpage">
      <ScreenTopBar title="2 Factor Auth" showAvatar={false} />

      <p className="settings-lead">
        Add an extra layer of security to your account.
      </p>

      <div className="settings-card">
        <button type="button" className="settings-toggle-row" onClick={toggle}>
          <span>
            <i className="ri-shield-keyhole-line" aria-hidden />
            Enable 2FA
          </span>
          <span className={`settings-switch${enabled ? ' on' : ''}`} aria-hidden>
            <span />
          </span>
        </button>
      </div>

      {toast && <div className="profile-toast">{toast}</div>}
    </div>
  )
}
