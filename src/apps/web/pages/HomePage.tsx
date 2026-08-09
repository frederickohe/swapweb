import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type TouchEvent,
} from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import type { Listing } from '../core/models'
import { listingsApi } from '../core/services'
import { ApiError } from '../core/utils/apiError'

const CATEGORIES = [
  { label: 'Cryptos', icon: '/icons/categories/cryptos.png' },
  { label: 'Services', icon: '/icons/categories/services.png' },
  { label: 'Phones', icon: '/icons/categories/phones.png' },
  { label: 'Laptops', icon: '/icons/categories/laptops.png' },
  { label: 'Cars', icon: '/icons/categories/cars.png' },
  { label: 'Games', icon: '/icons/categories/games.png' },
] as const

const PULL_THRESHOLD = 72

function formatPrice(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `GH₵ ${value.toFixed(2)}`
}

export function HomePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const keyword = searchParams.get('q')?.trim() || ''
  const category = searchParams.get('category')?.trim() || ''
  const refreshToken =
    typeof (location.state as { refresh?: unknown } | null)?.refresh === 'number'
      ? ((location.state as { refresh: number }).refresh)
      : 0

  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pullDistance, setPullDistance] = useState(0)

  const pullStartY = useRef<number | null>(null)
  const pulling = useRef(false)

  const loadListings = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setRefreshing(true)
      else setLoading(true)
      setError(null)

      try {
        const res = await listingsApi.search({
          keyword: keyword || undefined,
          category: category || undefined,
          page: 1,
          size: 40,
        })
        setListings(res.items)
      } catch (err: unknown) {
        setError(
          err instanceof ApiError || err instanceof Error
            ? err.message
            : 'Failed to load listings',
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
        setPullDistance(0)
      }
    },
    [keyword, category],
  )

  useEffect(() => {
    void loadListings('initial')
  }, [loadListings, refreshToken])

  const selectCategory = (label: string) => {
    const params = new URLSearchParams()
    if (keyword) params.set('q', keyword)
    if (category !== label) params.set('category', label)
    const qs = params.toString()
    navigate(qs ? `/?${qs}` : '/', { state: { refresh: Date.now() } })
  }

  const onTouchStart = (e: TouchEvent) => {
    if (window.scrollY > 0 || loading || refreshing) {
      pullStartY.current = null
      pulling.current = false
      return
    }
    pullStartY.current = e.touches[0]?.clientY ?? null
    pulling.current = true
  }

  const onTouchMove = (e: TouchEvent) => {
    if (!pulling.current || pullStartY.current == null) return
    if (window.scrollY > 0) {
      pulling.current = false
      setPullDistance(0)
      return
    }
    const delta = (e.touches[0]?.clientY ?? 0) - pullStartY.current
    if (delta <= 0) {
      setPullDistance(0)
      return
    }
    setPullDistance(Math.min(delta * 0.45, 96))
  }

  const onTouchEnd = () => {
    if (!pulling.current) return
    const shouldRefresh = pullDistance >= PULL_THRESHOLD
    pulling.current = false
    pullStartY.current = null
    if (shouldRefresh) void loadListings('refresh')
    else setPullDistance(0)
  }

  const left = listings.filter((_, i) => i % 2 === 0)
  const right = listings.filter((_, i) => i % 2 === 1)
  const showPullHint = pullDistance > 8 || refreshing

  return (
    <div
      className="home-feed"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div
        className={`home-pull-indicator${showPullHint ? ' visible' : ''}${refreshing ? ' refreshing' : ''}`}
        style={{ height: refreshing ? 48 : pullDistance }}
        aria-hidden={!showPullHint}
      >
        <i
          className={`ri-refresh-line${refreshing || pullDistance >= PULL_THRESHOLD ? ' spin' : ''}`}
        />
        <span>{refreshing ? 'Refreshing…' : pullDistance >= PULL_THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}</span>
      </div>

      <div className="category-strip" role="list">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.label}
            type="button"
            role="listitem"
            className={`category-tile${category === cat.label ? ' active' : ''}`}
            onClick={() => selectCategory(cat.label)}
          >
            <img src={cat.icon} alt="" width={40} height={40} />
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      <h2 className="home-section-title">
        {category || keyword ? 'Results' : 'Recent Posts'}
      </h2>
      {(category || keyword) && (
        <p className="home-filter-hint">
          {[category, keyword ? `“${keyword}”` : ''].filter(Boolean).join(' · ')}
        </p>
      )}

      {loading && (
        <div className="loading-state">
          <i className="ri-loader-4-line spin" aria-hidden />
          <p>Loading listings…</p>
        </div>
      )}

      {!loading && error && <div className="error-state">{error}</div>}

      {!loading && !error && listings.length === 0 && (
        <div className="empty-state">
          <p>No posts yet.</p>
        </div>
      )}

      {!loading && !error && listings.length > 0 && (
        <div className="masonry-grid">
          <div className="masonry-col">
            {left.map((listing, i) => (
              <ListingCard key={listing.id} listing={listing} tall={i % 2 === 0} />
            ))}
          </div>
          <div className="masonry-col">
            {right.map((listing, i) => (
              <ListingCard key={listing.id} listing={listing} tall={i % 2 === 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ListingCard({ listing, tall }: { listing: Listing; tall: boolean }) {
  return (
    <Link to={`/listings/${listing.id}`} className={`feed-card${tall ? ' tall' : ''}`}>
      <div className="feed-card-media">
        {listing.images[0] ? (
          <img src={listing.images[0]} alt="" loading="lazy" />
        ) : (
          <div className="feed-card-placeholder">
            <i className="ri-image-line" aria-hidden />
          </div>
        )}
      </div>
      <div className="feed-card-body">
        <div className="feed-card-title">{listing.title}</div>
        <div className="feed-card-meta">
          <span>{listing.location || listing.category || 'Listing'}</span>
          <span className="feed-card-price">{formatPrice(listing.estimated_value)}</span>
        </div>
      </div>
    </Link>
  )
}
