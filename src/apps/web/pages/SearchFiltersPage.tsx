import { useMemo, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ScreenTopBar } from '../components/ScreenTopBar'
import { LISTING_CATEGORIES, LISTING_CONDITIONS } from '../core/models'
import {
  EMPTY_LISTING_FILTERS,
  type ListingFilters,
} from '../core/listingFilters'

const CONDITIONS = ['All', ...LISTING_CONDITIONS, 'Poor'] as const
const CATEGORIES = ['All', ...LISTING_CATEGORIES] as const

export function SearchFiltersPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const initial =
    (location.state as { filters?: ListingFilters } | null)?.filters ??
    EMPTY_LISTING_FILTERS

  const [condition, setCondition] = useState(initial.condition ?? 'All')
  const [category, setCategory] = useState(initial.category ?? 'All')
  const [minPrice, setMinPrice] = useState(
    initial.minPrice > 0 ? String(initial.minPrice) : '',
  )
  const [maxPrice, setMaxPrice] = useState(
    initial.maxPrice > 0 ? String(initial.maxPrice) : '',
  )
  const [locationText, setLocationText] = useState(initial.location)

  const result = useMemo<ListingFilters>(
    () => ({
      condition: condition === 'All' ? null : condition,
      category: category === 'All' ? null : category,
      minPrice: Number(minPrice) || 0,
      maxPrice: Number(maxPrice) || 0,
      location: locationText.trim(),
    }),
    [condition, category, minPrice, maxPrice, locationText],
  )

  const apply = (e?: FormEvent) => {
    e?.preventDefault()
    navigate('/my-listings', { state: { filters: result } })
  }

  const reset = () => {
    setCondition('All')
    setCategory('All')
    setMinPrice('')
    setMaxPrice('')
    setLocationText('')
  }

  return (
    <div className="filters-page">
      <ScreenTopBar title="Filters" showAvatar={false} />

      <form className="filters-form" onSubmit={apply}>
        <section className="filters-section">
          <h2>Condition</h2>
          <div className="filters-chips">
            {CONDITIONS.map((item) => (
              <button
                key={item}
                type="button"
                className={`filter-chip${condition === item ? ' active' : ''}`}
                onClick={() => setCondition(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="filters-section">
          <h2>Category</h2>
          <div className="filters-chips">
            {CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                className={`filter-chip${category === item ? ' active' : ''}`}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="filters-section">
          <h2>Price range (GH₵)</h2>
          <div className="filters-price-row">
            <label className="form-group">
              <span className="form-label">Min</span>
              <input
                className="form-input"
                type="number"
                min={0}
                inputMode="decimal"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="0"
              />
            </label>
            <label className="form-group">
              <span className="form-label">Max</span>
              <input
                className="form-input"
                type="number"
                min={0}
                inputMode="decimal"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Any"
              />
            </label>
          </div>
        </section>

        <section className="filters-section">
          <h2>Location</h2>
          <input
            className="form-input"
            type="text"
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            placeholder="Area or city"
          />
        </section>

        <div className="filters-actions">
          <button type="button" className="btn btn-secondary" onClick={reset}>
            Reset
          </button>
          <button type="submit" className="btn btn-primary">
            Apply filters
          </button>
        </div>
      </form>
    </div>
  )
}
