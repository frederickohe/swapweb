import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ScreenTopBar } from '../components/ScreenTopBar'
import { swapsApi } from '../core/services'
import { ApiError } from '../core/utils/apiError'

export function PayTransactionPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const state = (location.state as {
    title?: string
    subtitle?: string
    feeAmount?: number
  } | null) ?? {}

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reference, setReference] = useState('')
  const [awaitingConfirm, setAwaitingConfirm] = useState(false)

  const startPay = async () => {
    setBusy(true)
    setError(null)
    try {
      const { authorizationUrl, reference: ref } = await swapsApi.startInitiatorFee(id)
      setReference(ref)
      setAwaitingConfirm(true)
      window.open(authorizationUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Could not open payment checkout',
      )
    } finally {
      setBusy(false)
    }
  }

  const confirmPay = async () => {
    if (!reference) return
    setBusy(true)
    setError(null)
    try {
      await swapsApi.confirmInitiatorFee(reference)
      navigate('/swap-bay', { replace: true, state: { tab: 'readySwaps' } })
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Could not confirm payment',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="settings-subpage">
      <ScreenTopBar
        title="Pay Transaction"
        showAvatar={false}
        onBack={() => navigate('/swap-bay', { state: { tab: 'accepted' } })}
      />

      <div className="pay-card">
        <h2>{state.title || 'Swap request'}</h2>
        {state.subtitle ? <p>{state.subtitle}</p> : null}
        {state.feeAmount != null && state.feeAmount > 0 ? (
          <p className="pay-fee">
            Fee: <strong>GH₵ {state.feeAmount.toFixed(2)}</strong>
          </p>
        ) : null}

        {error && (
          <div className="auth-alert auth-alert-error" style={{ marginTop: 12 }}>
            <i className="ri-error-warning-line" aria-hidden />
            <span>{error}</span>
          </div>
        )}

        {!awaitingConfirm ? (
          <button
            type="button"
            className="btn btn-primary btn-block"
            style={{ marginTop: 20 }}
            disabled={busy}
            onClick={() => void startPay()}
          >
            {busy ? 'Starting…' : 'Pay with Paystack'}
          </button>
        ) : (
          <div className="pay-confirm">
            <p className="form-hint">
              Complete payment in the Paystack window, then confirm below.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={busy}
              onClick={() => void confirmPay()}
            >
              {busy ? 'Confirming…' : 'I’ve paid — confirm'}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-block"
              disabled={busy}
              onClick={() => void startPay()}
            >
              Reopen checkout
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
