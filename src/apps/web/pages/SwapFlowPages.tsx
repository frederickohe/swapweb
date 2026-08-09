import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ScreenTopBar } from '../components/ScreenTopBar'
import type { Listing } from '../core/models'
import { formatListingPriceValue } from '../core/models'
import { listingsApi, swapsApi } from '../core/services'
import { ApiError } from '../core/utils/apiError'

type SwapFlowState = {
  target?: Listing
  offer?: Listing
}

function useSwapListings() {
  const { id = '' } = useParams()
  const location = useLocation()
  const state = (location.state as SwapFlowState | null) ?? {}
  return { id, state, target: state.target, offer: state.offer }
}

function ProductCard({ listing }: { listing: Listing }) {
  const image = listing.images[0]
  return (
    <article className="swap-product-card">
      <div className="swap-product-card-media">
        {image ? (
          <img src={image} alt="" />
        ) : (
          <div className="swap-product-card-empty">
            <i className="ri-image-line" aria-hidden />
          </div>
        )}
      </div>
      <div className="swap-product-card-body">
        <strong>{listing.title}</strong>
        <span>{listing.category || 'Listing'}</span>
        <em>{formatListingPriceValue(listing.estimated_value)}</em>
      </div>
    </article>
  )
}

function parseAmount(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null
  return value
}

function amountIsLower(a: number | null, b: number | null): boolean {
  if (a == null || b == null) return false
  return a < b - 0.01
}

/** Step 1 — Interested in this property? */
export function SwapInterestPage() {
  const navigate = useNavigate()
  const { id, target } = useSwapListings()
  const [listing, setListing] = useState<Listing | null>(target ?? null)
  const [loading, setLoading] = useState(!target)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (target || !id) return
    let cancelled = false
    setLoading(true)
    void listingsApi
      .getById(id)
      .then((data) => {
        if (!cancelled) setListing(data)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof ApiError || err instanceof Error
            ? err.message
            : 'Failed to load listing',
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, target])

  if (loading) {
    return (
      <div className="swap-gold-page">
        <ScreenTopBar title="Swapping" showAvatar={false} light />
        <div className="loading-state invert">
          <i className="ri-loader-4-line spin" aria-hidden />
        </div>
      </div>
    )
  }

  if (error || !listing) {
    return (
      <div className="swap-gold-page">
        <ScreenTopBar title="Swapping" showAvatar={false} light />
        <div className="error-state invert">
          <p>{error || 'Listing not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="swap-gold-page">
      <ScreenTopBar title="Swapping" showAvatar={false} light />
      <div className="swap-gold-body">
        <h2>Interested in this property?</h2>
        <ProductCard listing={listing} />
        <button
          type="button"
          className="swap-ink-btn"
          onClick={() =>
            navigate(`/listings/${listing.id}/swap/select`, {
              state: { target: listing },
            })
          }
        >
          Confirm
        </button>
      </div>
    </div>
  )
}

/** Step 2 — Select one of your listings */
export function SwapSelectListingPage() {
  const navigate = useNavigate()
  const { id, target } = useSwapListings()
  const [items, setItems] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void listingsApi
      .mine()
      .then((rows) => {
        if (cancelled) return
        setItems(rows.filter((item) => item.id !== id && item.id !== target?.id))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof ApiError || err instanceof Error
            ? err.message
            : 'Failed to load your listings',
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, target?.id])

  if (!target) {
    return (
      <div className="swap-flow-page">
        <ScreenTopBar title="Your listings" showAvatar={false} />
        <div className="empty-state">
          <p>Start from a listing to begin a swap.</p>
          <Link to={id ? `/listings/${id}` : '/'} className="btn btn-secondary">
            Go back
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="swap-flow-page">
      <ScreenTopBar title="Your listings" showAvatar={false} />
      <p className="swap-select-hint">
        Select a property from your listings to offer in this swap.
      </p>

      {loading && (
        <div className="loading-state">
          <i className="ri-loader-4-line spin" aria-hidden />
          <p>Loading your listings…</p>
        </div>
      )}

      {!loading && error && <div className="error-state">{error}</div>}

      {!loading && !error && items.length === 0 && (
        <div className="empty-state">
          <p>You need a listing to offer.</p>
          <Link to="/listings/new" className="btn btn-primary">
            Create listing
          </Link>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="swap-select-list">
          {items.map((item) => (
            <li key={item.id} className="swap-select-row">
              <div className="swap-select-media">
                {item.images[0] ? (
                  <img src={item.images[0]} alt="" />
                ) : (
                  <i className="ri-image-line" aria-hidden />
                )}
              </div>
              <div className="swap-select-copy">
                <strong>{item.title}</strong>
                <span>{formatListingPriceValue(item.estimated_value)}</span>
              </div>
              <button
                type="button"
                className="swap-select-btn"
                onClick={() =>
                  navigate(`/listings/${target.id}/swap/confirm-yours`, {
                    state: { target, offer: item },
                  })
                }
              >
                Select
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Step 3 — Confirm your property + settlement sheet */
export function SwapConfirmYoursPage() {
  const navigate = useNavigate()
  const { target, offer } = useSwapListings()
  const [sheetOpen, setSheetOpen] = useState(false)

  if (!target || !offer) {
    return (
      <div className="swap-gold-page">
        <ScreenTopBar title="Swapping" showAvatar={false} light />
        <div className="empty-state invert">
          <p>No listing selected</p>
          <button type="button" className="swap-ink-btn" onClick={() => navigate(-1)}>
            Go back
          </button>
        </div>
      </div>
    )
  }

  const yours = parseAmount(offer.estimated_value)
  const theirs = parseAmount(target.estimated_value)
  const mismatch =
    yours == null || theirs == null || Math.abs(yours - theirs) > 0.01
  const yoursLower = amountIsLower(yours, theirs)

  const continueToDash = () => {
    setSheetOpen(false)
    navigate(`/listings/${target.id}/swap/confirm`, {
      state: { target, offer },
    })
  }

  return (
    <div className="swap-gold-page">
      <ScreenTopBar title="Swapping" showAvatar={false} light />
      <div className="swap-gold-body">
        <h2>Confirm Your Property</h2>
        <ProductCard listing={offer} />
        <button type="button" className="swap-ink-btn" onClick={() => setSheetOpen(true)}>
          Confirm Your Property
        </button>
      </div>

      {sheetOpen && (
        <div className="swap-sheet-backdrop" onClick={() => setSheetOpen(false)}>
          <div
            className="swap-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Settlement"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="swap-sheet-pair">
              <div className="swap-sheet-item">
                <div className="swap-sheet-thumb">
                  {offer.images[0] ? <img src={offer.images[0]} alt="" /> : null}
                </div>
                <strong>{offer.title}</strong>
                <span
                  className={
                    mismatch ? (yoursLower ? 'price-lower' : 'price-higher') : undefined
                  }
                >
                  {formatListingPriceValue(offer.estimated_value)}
                </span>
              </div>
              <i className="ri-arrow-left-right-line swap-sheet-swap-icon" aria-hidden />
              <div className="swap-sheet-item">
                <div className="swap-sheet-thumb">
                  {target.images[0] ? <img src={target.images[0]} alt="" /> : null}
                </div>
                <strong>{target.title}</strong>
                <span
                  className={
                    mismatch ? (yoursLower ? 'price-higher' : 'price-lower') : undefined
                  }
                >
                  {formatListingPriceValue(target.estimated_value)}
                </span>
              </div>
            </div>

            {mismatch && (
              <>
                <p>
                  The transaction is not a perfect match because of price difference
                </p>
                <p>
                  {yoursLower
                    ? 'Do you agree to make a top-up payment for this transaction?'
                    : 'Do you want to ask the other party to make a top-up payment for this transaction?'}
                </p>
              </>
            )}

            <button type="button" className="swap-ink-btn" onClick={continueToDash}>
              {mismatch ? 'Agree Difference Settlement' : 'Confirm'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Step 4 — Confirm Swap side-by-side */
export function SwapConfirmDashPage() {
  const navigate = useNavigate()
  const { target, offer } = useSwapListings()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slide, setSlide] = useState(0)

  const yours = parseAmount(offer?.estimated_value)
  const theirs = parseAmount(target?.estimated_value)
  const yoursLower = amountIsLower(yours, theirs)
  const pricesMatch =
    yours != null && theirs != null && Math.abs(yours - theirs) <= 0.01

  const onSubmit = async () => {
    if (!target || !offer) return
    setSubmitting(true)
    setError(null)
    try {
      await swapsApi.createRequest(target.id, offer.id)
      navigate(`/listings/${target.id}/swap/complete`, {
        state: { target, offer },
        replace: true,
      })
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Could not create swap request',
      )
      setSlide(0)
    } finally {
      setSubmitting(false)
    }
  }

  if (!target || !offer) {
    return (
      <div className="swap-flow-page">
        <ScreenTopBar title="Confirm Swap" showAvatar={false} />
        <div className="empty-state">
          <p>Swap details are incomplete.</p>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
            Go back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="swap-confirm-dash">
      <ScreenTopBar title="Confirm Swap" showAvatar={false} />

      <div className="swap-dash-heroes">
        <div className="swap-dash-hero">
          {offer.images[0] ? <img src={offer.images[0]} alt="" /> : null}
        </div>
        <div className="swap-dash-hero">
          {target.images[0] ? <img src={target.images[0]} alt="" /> : null}
        </div>
      </div>

      <div className="swap-dash-icons">
        <span>Yours</span>
        <i className="ri-arrow-left-right-line" aria-hidden />
        <span>Theirs</span>
      </div>

      <div className="swap-dash-titles">
        <strong>{offer.title}</strong>
        <strong>{target.title}</strong>
      </div>

      <div className="swap-dash-prices">
        <span className={!pricesMatch && yoursLower ? 'price-lower' : !pricesMatch ? 'price-higher' : undefined}>
          {formatListingPriceValue(offer.estimated_value)}
        </span>
        <span className={!pricesMatch && yoursLower ? 'price-higher' : !pricesMatch ? 'price-lower' : undefined}>
          {formatListingPriceValue(target.estimated_value)}
        </span>
      </div>

      <div className="swap-dash-compare">
        <div>
          <small>Category</small>
          <span>{offer.category || '—'}</span>
        </div>
        <div>
          <small>Category</small>
          <span>{target.category || '—'}</span>
        </div>
        <div>
          <small>Location</small>
          <span>{offer.location || '—'}</span>
        </div>
        <div>
          <small>Location</small>
          <span>{target.location || '—'}</span>
        </div>
        <div>
          <small>Condition</small>
          <span>{offer.condition || '—'}</span>
        </div>
        <div>
          <small>Condition</small>
          <span>{target.condition || '—'}</span>
        </div>
      </div>

      {error && <p className="swap-dash-error">{error}</p>}

      <div className="swap-dash-cta">
        <SlideToSwap
          value={slide}
          disabled={submitting}
          onChange={setSlide}
          onConfirm={() => void onSubmit()}
        />
      </div>
    </div>
  )
}

function SlideToSwap({
  value,
  disabled,
  onChange,
  onConfirm,
}: {
  value: number
  disabled?: boolean
  onChange: (v: number) => void
  onConfirm: () => void
}) {
  const knobStyle = useMemo(
    () => ({ '--slide': `${Math.min(100, Math.max(0, value))}%` }) as CSSProperties,
    [value],
  )

  return (
    <div className={`slide-to-swap${disabled ? ' disabled' : ''}`} style={knobStyle}>
      <span className="slide-to-swap-label">
        {disabled ? 'Sending…' : value > 85 ? 'Release to swap' : 'Swipe to Swap'}
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        disabled={disabled}
        aria-label="Swipe to confirm swap"
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={() => {
          if (value >= 90) onConfirm()
          else onChange(0)
        }}
        onTouchEnd={() => {
          if (value >= 90) onConfirm()
          else onChange(0)
        }}
      />
    </div>
  )
}

/** Step 5 — Success */
export function SwapCompletePage() {
  const navigate = useNavigate()
  const { target } = useSwapListings()

  return (
    <div className="swap-complete-page">
      <ScreenTopBar title="Swapping" showAvatar={false} light />
      <div className="swap-complete-body">
        <h2>Swap Request Sent</h2>
        {target?.images[0] ? (
          <img className="swap-complete-image" src={target.images[0]} alt="" />
        ) : (
          <div className="swap-complete-image empty">
            <i className="ri-checkbox-circle-line" aria-hidden />
          </div>
        )}
        <p>Your offer is in Swap Bay. We’ll notify you when the owner responds.</p>
        <button
          type="button"
          className="swap-ink-btn"
          onClick={() => navigate('/swap-bay', { replace: true })}
        >
          Proceed
        </button>
      </div>
    </div>
  )
}
