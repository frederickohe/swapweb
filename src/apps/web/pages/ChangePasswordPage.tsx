import { useState, type FormEvent } from 'react'
import { ScreenTopBar } from '../components/ScreenTopBar'
import { useAuth } from '../core/AuthContext'
import { authApi } from '../core/services'
import { ApiError } from '../core/utils/apiError'

export function ChangePasswordPage() {
  const { user } = useAuth()
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Email is required.')
      return
    }
    if (password.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await authApi.resetPassword(email.trim(), password)
      setSuccess('Password updated successfully.')
      setPassword('')
      setConfirm('')
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Failed to change password',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="settings-subpage">
      <ScreenTopBar title="Change Password" showAvatar={false} />

      <p className="settings-lead">
        Set a new password for your account. Use the email linked to your SwapPro
        login.
      </p>

      {error && (
        <div className="auth-alert auth-alert-error">
          <i className="ri-error-warning-line" aria-hidden />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="auth-alert auth-alert-success">
          <i className="ri-checkbox-circle-line" aria-hidden />
          <span>{success}</span>
        </div>
      )}

      <form className="settings-form" onSubmit={(e) => void submit(e)}>
        <div className="form-group">
          <label className="form-label" htmlFor="pw-email">
            Email
          </label>
          <input
            id="pw-email"
            className="form-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="pw-new">
            New password
          </label>
          <input
            id="pw-new"
            className="form-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="pw-confirm">
            Confirm password
          </label>
          <input
            id="pw-confirm"
            className="form-input"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
          {saving ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
