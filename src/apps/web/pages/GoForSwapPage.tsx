import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ScreenTopBar } from '../components/ScreenTopBar'
import type { MeetupDetails } from '../core/models'
import { swapsApi } from '../core/services'
import { ApiError } from '../core/utils/apiError'

const DEFAULT_CENTER: [number, number] = [5.6037, -0.187]
const GOLD = '#c3b649'
const GREEN = '#176b02'

function pinIcon(color: string) {
  return L.divIcon({
    className: 'meetup-pin',
    html: `<span class="meetup-pin-dot" style="background:${color}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
  })
}

export function GoForSwapPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const fallbackTitle =
    (location.state as { title?: string } | null)?.title ?? 'Listing'

  const [details, setDetails] = useState<MeetupDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const mapEl = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)

  const isCompleted = (details?.swap_status ?? '').toUpperCase() === 'COMPLETED'

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void swapsApi
      .meetupDetails(id)
      .then((data) => {
        if (!cancelled) setDetails(data)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof ApiError || err instanceof Error
            ? err.message
            : 'Failed to load swap details',
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (!mapEl.current || loading) return

    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
    }

    const map = L.map(mapEl.current, {
      center: DEFAULT_CENTER,
      zoom: 13,
      zoomControl: true,
    })
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)

    const points: L.LatLngExpression[] = []
    const counter = details?.counterparty_listing
    const yours = details?.your_listing

    if (counter?.location_lat != null && counter.location_lng != null) {
      const pt: L.LatLngExpression = [counter.location_lat, counter.location_lng]
      points.push(pt)
      L.marker(pt, { icon: pinIcon(GOLD) })
        .addTo(map)
        .bindTooltip(counter.title || 'Their item')
    }
    if (yours?.location_lat != null && yours.location_lng != null) {
      const pt: L.LatLngExpression = [yours.location_lat, yours.location_lng]
      points.push(pt)
      L.marker(pt, { icon: pinIcon(GREEN) })
        .addTo(map)
        .bindTooltip(yours.title || 'Your item')
    }

    if (points.length === 1) {
      map.setView(points[0], 14)
    } else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [48, 48] })
    }

    const resize = window.setTimeout(() => map.invalidateSize(), 80)
    return () => {
      window.clearTimeout(resize)
      map.remove()
      mapRef.current = null
    }
  }, [details, loading])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2400)
    return () => window.clearTimeout(t)
  }, [toast])

  const complete = async () => {
    if (completing || isCompleted) return
    setCompleting(true)
    try {
      await swapsApi.complete(id)
      setToast('Swap marked as completed.')
      window.setTimeout(() => {
        navigate('/swap-bay', { replace: true, state: { tab: 'history' } })
      }, 600)
    } catch (err) {
      setToast(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.',
      )
      setCompleting(false)
    }
  }

  const party = details?.counterparty
  const phone = party?.phone?.trim() ?? ''

  return (
    <div className="go-for-swap-page">
      <ScreenTopBar
        title="Go For Swap"
        showAvatar={false}
        onBack={() => navigate('/swap-bay', { state: { tab: 'readySwaps' } })}
      />

      <div className="go-swap-details">
        {loading && (
          <div className="loading-state">
            <i className="ri-loader-4-line spin" aria-hidden />
            <p>Loading…</p>
          </div>
        )}
        {!loading && error && <div className="error-state">{error}</div>}
        {!loading && !error && details && (
          <>
            <h2>Receiver details</h2>
            {party?.fullname ? <p className="go-swap-name">{party.fullname}</p> : null}
            {phone ? (
              <div className="go-swap-row">
                <span>Phone</span>
                <strong>{phone}</strong>
                <a className="go-swap-call" href={`tel:${phone}`} aria-label="Call">
                  <i className="ri-phone-fill" aria-hidden />
                </a>
              </div>
            ) : null}
            {party?.email ? (
              <div className="go-swap-row">
                <span>Email</span>
                <strong>{party.email}</strong>
              </div>
            ) : null}
            <div className="go-swap-row">
              <span>Their item</span>
              <strong>
                {details.counterparty_listing?.title || fallbackTitle}
              </strong>
            </div>
            <div className="go-swap-row">
              <span>Your item</span>
              <strong>{details.your_listing?.title || 'Your listing'}</strong>
            </div>
            {details.hub_name ? (
              <div className="go-swap-row">
                <span>Swap hub</span>
                <strong>{details.hub_name}</strong>
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="go-swap-map-wrap">
        {!loading && !error ? (
          <div ref={mapEl} className="go-swap-map" />
        ) : (
          <div className="go-swap-map-placeholder">Map loads with meetup details</div>
        )}
      </div>

      {!loading && details && (
        <div className="go-swap-footer">
          <button
            type="button"
            className="btn go-swap-complete"
            disabled={isCompleted || completing}
            onClick={() => void complete()}
          >
            {completing
              ? 'Completing…'
              : isCompleted
                ? 'Swap Completed'
                : 'Mark Swap Complete'}
          </button>
        </div>
      )}

      {toast && <div className="profile-toast">{toast}</div>}
    </div>
  )
}
