import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ScreenTopBar } from '../components/ScreenTopBar'
import type { SwapRequest } from '../core/models'
import { swapsApi } from '../core/services'
import { ApiError } from '../core/utils/apiError'

type SwapBayTab = 'sent' | 'received' | 'accepted' | 'readySwaps' | 'history'

const TABS: Array<{ id: SwapBayTab; label: string; ready?: boolean }> = [
  { id: 'sent', label: 'Sent' },
  { id: 'received', label: 'Received' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'readySwaps', label: 'Ready Swap', ready: true },
  { id: 'history', label: 'History' },
]

function isCompleted(item: SwapRequest): boolean {
  return (item.swapStatus ?? '').toUpperCase() === 'COMPLETED'
}

function isReadySwap(item: SwapRequest): boolean {
  if (isCompleted(item)) return false
  if (item.status === 'PENDING_HUB_MEETING') return true
  if (item.initiator_fee_paid && item.owner_approved) {
    return (
      item.status === 'PENDING_INITIATOR_FEE' ||
      item.status === 'PENDING_HUB_MEETING' ||
      item.status === 'PENDING_OWNER_FEE'
    )
  }
  return false
}

function matchesTab(item: SwapRequest, tab: SwapBayTab): boolean {
  const ownerApproved = item.owner_approved === true
  switch (tab) {
    case 'sent':
      return (
        item.isInitiator &&
        item.status === 'PENDING_OWNER_APPROVAL' &&
        !ownerApproved
      )
    case 'received':
      return (
        item.isOwner &&
        item.status === 'PENDING_OWNER_APPROVAL' &&
        !ownerApproved
      )
    case 'accepted':
      return item.status === 'PENDING_INITIATOR_FEE' && !item.initiator_fee_paid
    case 'readySwaps':
      return isReadySwap(item)
    case 'history':
      return (item.isInitiator || item.isOwner) && isCompleted(item)
    default:
      return false
  }
}

function yourCommitmentPaid(item: SwapRequest): boolean {
  return item.isInitiator ? !!item.initiator_fee_paid : !!item.owner_fee_paid
}

export function SwapBayPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [items, setItems] = useState<SwapRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<SwapBayTab>(
    (location.state as { tab?: SwapBayTab } | null)?.tab ?? 'received',
  )
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await swapsApi.listRequests('all'))
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Failed to load swap requests',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const next = (location.state as { tab?: SwapBayTab } | null)?.tab
    if (next) setTab(next)
  }, [location.state])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2400)
    return () => window.clearTimeout(t)
  }, [toast])

  const visible = useMemo(() => items.filter((item) => matchesTab(item, tab)), [items, tab])
  const tabLabel = TABS.find((t) => t.id === tab)?.label ?? 'Swap'

  const runAction = async (id: string, action: () => Promise<unknown>, okMsg: string, nextTab?: SwapBayTab) => {
    if (busyId) return
    setBusyId(id)
    try {
      await action()
      setToast(okMsg)
      if (nextTab) setTab(nextTab)
      await load()
    } catch (err) {
      setToast(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Action failed',
      )
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="swap-bay-page">
      <ScreenTopBar title="Swap Bay" showBack={false} />

      <div className="swap-tabs" role="tablist" aria-label="Swap Bay tabs">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`swap-tab${tab === item.id ? ' active' : ''}${
              item.ready && tab === item.id ? ' ready' : ''
            }`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="loading-state">
          <i className="ri-loader-4-line spin" aria-hidden />
          <p>Loading swap requests…</p>
        </div>
      )}

      {!loading && error && <div className="error-state">{error}</div>}

      {!loading && !error && visible.length === 0 && (
        <div className="empty-state">
          <p>No {tabLabel.toLowerCase()} swap requests yet.</p>
        </div>
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="swap-bay-list">
          {visible.map((item) => {
            const busy = busyId === item.id
            return (
              <article key={item.id} className="swap-bay-row">
                <div className="swap-bay-thumb">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" />
                  ) : (
                    <i className="ri-image-line" aria-hidden />
                  )}
                </div>

                <div className="swap-bay-copy">
                  <h3>{item.title}</h3>
                  <p>{item.subtitle}</p>
                  {item.price ? <strong>{item.price}</strong> : null}
                </div>

                <div className="swap-bay-actions">
                  {tab === 'sent' && (
                    <button
                      type="button"
                      className="swap-action swap-action-danger"
                      disabled={busy}
                      onClick={() =>
                        void runAction(
                          item.id,
                          () => swapsApi.cancel(item.id),
                          `Cancelled request for ${item.title}`,
                        )
                      }
                    >
                      Cancel Request
                    </button>
                  )}

                  {tab === 'received' && (
                    <>
                      <button
                        type="button"
                        className="swap-action swap-action-ink"
                        disabled={busy}
                        onClick={() =>
                          void runAction(
                            item.id,
                            () => swapsApi.approve(item.id),
                            `Accepted offer for ${item.title}`,
                            'accepted',
                          )
                        }
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="swap-action swap-action-danger wide"
                        disabled={busy}
                        onClick={() =>
                          void runAction(
                            item.id,
                            () => swapsApi.reject(item.id),
                            `Declined offer for ${item.title}`,
                          )
                        }
                      >
                        Cancel Offer
                      </button>
                    </>
                  )}

                  {tab === 'accepted' &&
                    (item.isInitiator && !yourCommitmentPaid(item) ? (
                      <button
                        type="button"
                        className="swap-action swap-action-green wide"
                        disabled={busy}
                        onClick={() =>
                          navigate(`/swap-bay/${item.id}/pay`, {
                            state: {
                              title: item.title,
                              subtitle: item.subtitle,
                              feeAmount: item.feeAmount,
                            },
                          })
                        }
                      >
                        Pay Transaction
                      </button>
                    ) : !item.isInitiator ? (
                      <span className="swap-action-hint">Waiting for payment</span>
                    ) : (
                      <span className="swap-action-hint">Paid</span>
                    ))}

                  {tab === 'readySwaps' && (
                    <button
                      type="button"
                      className="swap-action swap-action-green"
                      onClick={() =>
                        navigate(`/swap-bay/${item.id}/go`, {
                          state: { title: item.title },
                        })
                      }
                    >
                      Go For Swap
                    </button>
                  )}

                  {tab === 'history' && (
                    <span className="swap-action swap-action-completed">Completed</span>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {toast && <div className="profile-toast">{toast}</div>}
    </div>
  )
}
