import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useAuth } from '../core/AuthContext'
import { getAppConfig, hasGeoapifyApiKey } from '../core/appConfig'
import { reverseGeocodeArea } from '../core/geocoding'
import { LISTING_CATEGORIES, LISTING_CONDITIONS } from '../core/models'
import { listingsApi } from '../core/services'
import { ApiError } from '../core/utils/apiError'

type Step = 1 | 2 | 3 | 4 | 5

const MAX_PHOTOS = 5
const DEFAULT_CENTER: [number, number] = [5.6037, -0.187]
const WISH_FINDING_FEE = 5
const BUDGET_NEGOTIATION_FEE = 5
const COLLECTION_ASSISTANCE_FEE = 10

const CURRENCIES = [
  'GHS',
  'USD',
  'EUR',
  'GBP',
  'NGN',
  'XOF',
  'XAF',
  'KES',
  'ZAR',
  'CAD',
  'AUD',
  'CHF',
  'CNY',
  'INR',
  'AED',
]

function categoryIcon(label: string): string {
  const s = label.toLowerCase()
  if (s.includes('elect')) return 'ri-smartphone-line'
  if (s.includes('home') || s.includes('kitchen')) return 'ri-sofa-line'
  if (s.includes('kid')) return 'ri-bear-smile-line'
  if (s.includes('book')) return 'ri-book-open-line'
  if (s.includes('fashion')) return 'ri-t-shirt-line'
  if (s.includes('sport')) return 'ri-football-line'
  if (s.includes('tool')) return 'ri-tools-line'
  if (s.includes('fitness')) return 'ri-dumbbell-line'
  if (s.includes('beauty')) return 'ri-sparkling-2-line'
  if (s.includes('vehicle part')) return 'ri-settings-3-line'
  if (s.includes('vehicle')) return 'ri-car-line'
  if (s.includes('personal care')) return 'ri-heart-pulse-line'
  if (s.includes('media')) return 'ri-movie-2-line'
  if (s.includes('video game')) return 'ri-gamepad-line'
  return 'ri-apps-2-line'
}

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, '')
  const value = Number(cleaned)
  return Number.isFinite(value) && value > 0 ? value : null
}

function firstNameFrom(fullName: string | undefined | null): string {
  const raw = (fullName ?? '').trim()
  if (!raw) return 'there'
  return raw.split(/\s+/)[0] ?? 'there'
}

type PhotoItem = { id: string; file: File; previewUrl: string }

export function CreateListingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step, setStep] = useState<Step>(1)

  // Step 1
  const [category, setCategory] = useState<string | null>(null)

  // Step 2
  const [specLabel, setSpecLabel] = useState<PhotoItem | null>(null)

  // Step 3
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [buildVersion, setBuildVersion] = useState('')
  const [condition, setCondition] = useState<string | null>(null)
  const [ownershipDocs, setOwnershipDocs] = useState(false)
  const [currency, setCurrency] = useState('GHS')
  const [estimatedValue, setEstimatedValue] = useState('')
  const [locationLat, setLocationLat] = useState<number | null>(null)
  const [locationLng, setLocationLng] = useState<number | null>(null)
  const [locationArea, setLocationArea] = useState<string | null>(null)
  const [wishlist, setWishlist] = useState<string[]>([])
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [showWishModal, setShowWishModal] = useState(false)
  const [wishDraft, setWishDraft] = useState('')

  // Step 4
  const [photos, setPhotos] = useState<PhotoItem[]>([])

  // Step 5
  const [wishFinding, setWishFinding] = useState(false)
  const [budgetNegotiation, setBudgetNegotiation] = useState(false)
  const [collectionAssistance, setCollectionAssistance] = useState(false)
  const [budgetAmount, setBudgetAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const specInputRef = useRef<HTMLInputElement>(null)
  const photosInputRef = useRef<HTMLInputElement>(null)

  const greetingName = useMemo(() => firstNameFrom(user?.full_name), [user?.full_name])

  useEffect(() => {
    return () => {
      if (specLabel) URL.revokeObjectURL(specLabel.previewUrl)
      for (const photo of photos) URL.revokeObjectURL(photo.previewUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke only on unmount
  }, [])

  const detailsValid =
    title.trim().length >= 3 &&
    description.trim().length >= 10 &&
    !!condition &&
    parseAmount(estimatedValue) != null &&
    locationLat != null &&
    locationLng != null

  const addonTotal =
    (wishFinding ? WISH_FINDING_FEE : 0) +
    (budgetNegotiation ? BUDGET_NEGOTIATION_FEE : 0) +
    (collectionAssistance ? COLLECTION_ASSISTANCE_FEE : 0)

  const goBack = () => {
    if (submitting) return
    setErrorMessage(null)
    if (step === 1) {
      navigate(-1)
      return
    }
    setStep((s) => (s - 1) as Step)
  }

  const onPickSpec = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (specLabel) URL.revokeObjectURL(specLabel.previewUrl)
    setSpecLabel({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    })
  }

  const onPickPhotos = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setPhotos((prev) => {
      const remaining = MAX_PHOTOS - prev.length
      const next = files.slice(0, remaining).map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      }))
      return [...prev, ...next]
    })
  }

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((p) => p.id !== id)
    })
  }

  const confirmLocation = async (lat: number, lng: number) => {
    setLocationLat(lat)
    setLocationLng(lng)
    setLocationArea(null)
    setShowLocationPicker(false)
    const area = await reverseGeocodeArea(lat, lng)
    setLocationArea(area)
  }

  const saveWish = () => {
    const trimmed = wishDraft.trim()
    if (!trimmed) return
    setWishlist((prev) => [...prev, trimmed])
    setWishDraft('')
    setShowWishModal(false)
  }

  const submit = async () => {
    if (submitting || !category || !specLabel || photos.length === 0) return
    if (locationLat == null || locationLng == null || !condition) return

    const value = parseAmount(estimatedValue)
    if (value == null) {
      setErrorMessage('Enter a valid estimated value')
      return
    }

    let budget: number | undefined
    if (budgetNegotiation) {
      budget = parseAmount(budgetAmount) ?? undefined
      if (budget == null) {
        setErrorMessage('Enter your maximum budget for Budget Negotiation')
        return
      }
    }

    setSubmitting(true)
    setErrorMessage(null)
    try {
      const specLabelUrl = await listingsApi.uploadImage(specLabel.file)
      const galleryUrls: string[] = []
      for (const photo of photos) {
        galleryUrls.push(await listingsApi.uploadImage(photo.file))
      }

      const primaryUrl = galleryUrls[0]
      const imageUrls = [...galleryUrls.slice(1), specLabelUrl]

      let area = locationArea?.trim() || null
      if (!area) {
        area = await reverseGeocodeArea(locationLat, locationLng)
      }

      const listing = await listingsApi.create({
        title: title.trim(),
        description: description.trim(),
        category,
        condition,
        estimated_value: value,
        primary_image_url: primaryUrl,
        image_urls: imageUrls,
        serial_number: serialNumber.trim() || undefined,
        build_version: buildVersion.trim() || undefined,
        ownership_documents_available: ownershipDocs,
        wishlist: wishlist.map((description) => ({ description })),
        location_lat: locationLat,
        location_lng: locationLng,
        location_area: area || undefined,
        wish_finding: wishFinding,
        budget_negotiation: budgetNegotiation,
        budget_amount: budget,
        collection_assistance: collectionAssistance,
      })

      navigate(`/listings/${listing.id}`, { replace: true })
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const locationLabel = (() => {
    if (locationLat == null || locationLng == null) return 'Tap to pick location on map'
    if (locationArea?.trim()) return locationArea.trim()
    return 'Location selected'
  })()

  return (
    <div className="add-belonging">
      <header className="add-belonging-header">
        <button
          type="button"
          className="add-belonging-back"
          aria-label="Go back"
          onClick={goBack}
          disabled={submitting}
        >
          <i className="ri-arrow-left-s-line" aria-hidden />
        </button>
        <h1 className="add-belonging-title">Add Belonging</h1>
        <span className="add-belonging-header-spacer" aria-hidden />
      </header>

      {errorMessage && (
        <div className="auth-alert auth-alert-error add-belonging-alert">
          <i className="ri-error-warning-line" aria-hidden />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="add-belonging-body">
        {step === 1 && (
          <section className="add-belonging-step">
            <p className="add-belonging-hero">
              Hi {greetingName}, Detail your belonging for us
            </p>
            <h2 className="add-belonging-section-title">Select Category</h2>
            <div className="add-belonging-category-grid">
              {LISTING_CATEGORIES.map((label) => {
                const selected = category === label
                return (
                  <button
                    key={label}
                    type="button"
                    className={`add-belonging-category-card${selected ? ' selected' : ''}`}
                    onClick={() => setCategory(label)}
                    aria-pressed={selected}
                  >
                    <span className="add-belonging-category-icon" aria-hidden>
                      <i className={categoryIcon(label)} />
                    </span>
                    <span className="add-belonging-category-label">{label}</span>
                    <span
                      className={`add-belonging-category-check${selected ? ' on' : ''}`}
                      aria-hidden
                    >
                      {selected ? <i className="ri-check-line" /> : null}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="add-belonging-step">
            <p className="add-belonging-hero">Provide us the specification label</p>
            <div className="add-belonging-spec-upload">
              <button
                type="button"
                className="add-belonging-upload-tile"
                onClick={() => specInputRef.current?.click()}
                aria-label="Upload specification label photo"
              >
                {specLabel ? (
                  <img src={specLabel.previewUrl} alt="Specification label preview" />
                ) : (
                  <i className="ri-add-line" aria-hidden />
                )}
              </button>
              <p className="add-belonging-upload-caption">Click to upload photo</p>
              <input
                ref={specInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={onPickSpec}
              />
            </div>
            <p className="add-belonging-hero add-belonging-hero-secondary">
              If specification label not available, add image of an identifying feature
            </p>
          </section>
        )}

        {step === 3 && (
          <section className="add-belonging-step">
            <p className="add-belonging-hero">Now describe the details of your belonging</p>

            <input
              className="add-belonging-field"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="add-belonging-field add-belonging-textarea"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
            />
            <input
              className="add-belonging-field"
              placeholder="Serial number (optional)"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
            />
            <input
              className="add-belonging-field"
              placeholder="Build version (optional)"
              value={buildVersion}
              onChange={(e) => setBuildVersion(e.target.value)}
            />

            <div className="add-belonging-field add-belonging-select-wrap">
              <select
                className="add-belonging-select"
                value={condition ?? ''}
                onChange={(e) => setCondition(e.target.value || null)}
              >
                <option value="" disabled>
                  Condition
                </option>
                {LISTING_CONDITIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <i className="ri-arrow-down-s-line" aria-hidden />
            </div>

            <button
              type="button"
              className="add-belonging-toggle-row"
              onClick={() => setOwnershipDocs((v) => !v)}
            >
              <span>Ownership documents available</span>
              <span className={`settings-switch${ownershipDocs ? ' on' : ''}`} aria-hidden>
                <span />
              </span>
            </button>

            <label className="add-belonging-field-label">Estimated value</label>
            <div className="add-belonging-price-row">
              <select
                className="add-belonging-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                aria-label="Currency"
              >
                {CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
              <input
                className="add-belonging-price-input"
                inputMode="decimal"
                placeholder="Enter estimated value"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
              />
            </div>

            <label className="add-belonging-field-label">Location</label>
            <button
              type="button"
              className={`add-belonging-location-field${locationLat != null ? ' has-value' : ''}`}
              onClick={() => setShowLocationPicker(true)}
            >
              <i className="ri-map-2-line" aria-hidden />
              <span>{locationLabel}</span>
              <i className="ri-arrow-right-s-line" aria-hidden />
            </button>

            {wishlist.length > 0 && (
              <div className="add-belonging-wish-chips">
                {wishlist.map((wish, index) => (
                  <span key={`${wish}-${index}`} className="add-belonging-wish-chip">
                    {wish}
                    <button
                      type="button"
                      aria-label={`Remove ${wish}`}
                      onClick={() => setWishlist((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <i className="ri-close-line" aria-hidden />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <button
              type="button"
              className="add-belonging-wish-add"
              onClick={() => setShowWishModal(true)}
            >
              <i className="ri-add-line" aria-hidden />
              Add wishlist item
            </button>
          </section>
        )}

        {step === 4 && (
          <section className="add-belonging-step">
            <p className="add-belonging-hero">Almost done, add vivid photos</p>
            <p className="add-belonging-muted">
              Add up to {MAX_PHOTOS} photos of your item (first photo is the listing cover).
            </p>
            <div className="add-belonging-photo-grid">
              {photos.map((photo, index) => (
                <div key={photo.id} className="add-belonging-photo-tile">
                  <img src={photo.previewUrl} alt={`Photo ${index + 1}`} />
                  {index === 0 && <span className="add-belonging-cover-badge">Cover</span>}
                  <button
                    type="button"
                    className="add-belonging-photo-remove"
                    aria-label={`Remove photo ${index + 1}`}
                    onClick={() => removePhoto(photo.id)}
                  >
                    <i className="ri-close-line" aria-hidden />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  className="add-belonging-upload-tile add-belonging-upload-tile-sm"
                  onClick={() => photosInputRef.current?.click()}
                  aria-label="Add photo"
                >
                  <i className="ri-add-line" aria-hidden />
                </button>
              )}
            </div>
            <input
              ref={photosInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={onPickPhotos}
            />
          </section>
        )}

        {step === 5 && (
          <section className="add-belonging-step">
            <p className="add-belonging-hero">Add-on services</p>
            <p className="add-belonging-muted">
              Optional services that help close your swap. Selected fees are added to your
              transaction fee when a swap happens.
            </p>

            <h3 className="add-belonging-addon-group-title">Deal Assistance</h3>
            <p className="add-belonging-addon-group-sub">Select one or both options below.</p>

            <AddonTile
              selected={wishFinding}
              title="Wish Finding"
              subtitle="SwapPro finds matches for the wishlist on this listing."
              feeLabel={`+GHS ${WISH_FINDING_FEE}`}
              onToggle={() => setWishFinding((v) => !v)}
            />
            <AddonTile
              selected={budgetNegotiation}
              title="Budget Negotiation"
              subtitle="State the highest amount you can add for your wish or desired item."
              feeLabel={`+GHS ${BUDGET_NEGOTIATION_FEE}`}
              onToggle={() => setBudgetNegotiation((v) => !v)}
            />

            {budgetNegotiation && (
              <div className="add-belonging-budget-block">
                <label className="add-belonging-field-label" htmlFor="budgetAmount">
                  Your maximum budget (GHS)
                </label>
                <input
                  id="budgetAmount"
                  className="add-belonging-field"
                  inputMode="decimal"
                  placeholder="e.g. 200"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  disabled={submitting}
                />
              </div>
            )}

            <div className="add-belonging-divider" />

            <h3 className="add-belonging-addon-group-title">Collection Assistance</h3>
            <p className="add-belonging-addon-group-sub">
              We deliver the item to your listed location.
            </p>
            <AddonTile
              selected={collectionAssistance}
              title="Collection Assistance"
              subtitle="SwapPro delivers to the location you set on this listing."
              feeLabel={`+GHS ${COLLECTION_ASSISTANCE_FEE}`}
              onToggle={() => setCollectionAssistance((v) => !v)}
            />

            {addonTotal > 0 && (
              <div className="add-belonging-addon-total">
                <span>Add-on total (on transaction fee)</span>
                <strong>GHS {addonTotal}</strong>
              </div>
            )}

            <p className="add-belonging-muted">
              You can skip this step if you do not need any add-ons.
            </p>
          </section>
        )}
      </div>

      <div className="add-belonging-footer">
        {step === 1 && (
          <button
            type="button"
            className="btn btn-primary btn-block add-belonging-cta"
            disabled={!category}
            onClick={() => {
              setErrorMessage(null)
              setStep(2)
            }}
          >
            Next
          </button>
        )}
        {step === 2 && (
          <button
            type="button"
            className="btn btn-primary btn-block add-belonging-cta"
            disabled={!specLabel}
            onClick={() => {
              setErrorMessage(null)
              setStep(3)
            }}
          >
            Next
          </button>
        )}
        {step === 3 && (
          <button
            type="button"
            className="btn btn-primary btn-block add-belonging-cta"
            disabled={!detailsValid}
            onClick={() => {
              setErrorMessage(null)
              setStep(4)
            }}
          >
            Next
          </button>
        )}
        {step === 4 && (
          <button
            type="button"
            className="btn btn-primary btn-block add-belonging-cta"
            disabled={photos.length === 0}
            onClick={() => {
              setErrorMessage(null)
              setStep(5)
            }}
          >
            Next
          </button>
        )}
        {step === 5 && (
          <button
            type="button"
            className="btn btn-primary btn-block add-belonging-cta"
            disabled={submitting}
            onClick={() => void submit()}
          >
            {submitting
              ? 'Listing…'
              : addonTotal > 0
                ? 'List with add-ons'
                : 'List belonging'}
          </button>
        )}
      </div>

      {showLocationPicker && (
        <LocationPickerModal
          initialLat={locationLat}
          initialLng={locationLng}
          onClose={() => setShowLocationPicker(false)}
          onConfirm={(lat, lng) => void confirmLocation(lat, lng)}
        />
      )}

      {showWishModal && (
        <div className="add-belonging-modal" role="dialog" aria-modal="true">
          <div className="add-belonging-modal-sheet">
            <button
              type="button"
              className="add-belonging-back"
              aria-label="Close"
              onClick={() => {
                setWishDraft('')
                setShowWishModal(false)
              }}
            >
              <i className="ri-arrow-left-s-line" aria-hidden />
            </button>
            <h2>Add New Wishlist</h2>
            <input
              className="add-belonging-field"
              placeholder="What are you looking for?"
              value={wishDraft}
              onChange={(e) => setWishDraft(e.target.value)}
              autoFocus
            />
            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={!wishDraft.trim()}
              onClick={saveWish}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AddonTile({
  selected,
  title,
  subtitle,
  feeLabel,
  onToggle,
}: {
  selected: boolean
  title: string
  subtitle: string
  feeLabel: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      className={`add-belonging-addon-tile${selected ? ' selected' : ''}`}
      onClick={onToggle}
    >
      <span className={`add-belonging-addon-check${selected ? ' on' : ''}`} aria-hidden>
        {selected ? <i className="ri-check-line" /> : null}
      </span>
      <span className="add-belonging-addon-copy">
        <span className="add-belonging-addon-top">
          <strong>{title}</strong>
          <em>{feeLabel}</em>
        </span>
        <span className="add-belonging-addon-sub">{subtitle}</span>
      </span>
    </button>
  )
}

function LocationPickerModal({
  initialLat,
  initialLng,
  onClose,
  onConfirm,
}: {
  initialLat: number | null
  initialLng: number | null
  onClose: () => void
  onConfirm: (lat: number, lng: number) => void
}) {
  const mapEl = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const [selected, setSelected] = useState<[number, number] | null>(
    initialLat != null && initialLng != null ? [initialLat, initialLng] : null,
  )
  const [loadingLocation, setLoadingLocation] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!mapEl.current) return

    const map = L.map(mapEl.current, {
      center: selected ?? DEFAULT_CENTER,
      zoom: 14,
      zoomControl: true,
    })
    mapRef.current = map

    const apiKey = getAppConfig().geoapifyApiKey.trim()
    if (apiKey) {
      L.tileLayer(
        `https://maps.geoapify.com/v1/tile/osm-carto/{z}/{x}/{y}.png?apiKey=${encodeURIComponent(apiKey)}`,
        {
          attribution: '© OpenStreetMap · Powered by Geoapify',
          maxZoom: 20,
        },
      ).addTo(map)
    } else {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)
    }

    const pin = L.divIcon({
      className: 'meetup-pin',
      html: '<span class="meetup-pin-dot" style="background:#c3b649"></span>',
      iconSize: [22, 22],
      iconAnchor: [11, 22],
    })

    const placeMarker = (lat: number, lng: number) => {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        markerRef.current = L.marker([lat, lng], { icon: pin }).addTo(map)
      }
      setSelected([lat, lng])
    }

    if (selected) placeMarker(selected[0], selected[1])

    map.on('click', (e: L.LeafletMouseEvent) => {
      placeMarker(e.latlng.lat, e.latlng.lng)
      setLocalError(null)
    })

    const resize = window.setTimeout(() => map.invalidateSize(), 80)
    return () => {
      window.clearTimeout(resize)
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init map once
  }, [])

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocalError('Geolocation is not supported in this browser.')
      return
    }
    setLoadingLocation(true)
    setLocalError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setSelected([lat, lng])
        mapRef.current?.setView([lat, lng], 15)
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng])
        } else if (mapRef.current) {
          const pin = L.divIcon({
            className: 'meetup-pin',
            html: '<span class="meetup-pin-dot" style="background:#c3b649"></span>',
            iconSize: [22, 22],
            iconAnchor: [11, 22],
          })
          markerRef.current = L.marker([lat, lng], { icon: pin }).addTo(mapRef.current)
        }
        setLoadingLocation(false)
      },
      () => {
        setLocalError('Could not get your location. Tap the map instead.')
        setLoadingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  return (
    <div className="add-belonging-modal add-belonging-map-modal" role="dialog" aria-modal="true">
      <div className="add-belonging-map-sheet">
        <header className="add-belonging-map-header">
          <button type="button" className="add-belonging-back" aria-label="Close" onClick={onClose}>
            <i className="ri-arrow-left-s-line" aria-hidden />
          </button>
          <h2>Point your belonging on the map</h2>
        </header>
        <div ref={mapEl} className="add-belonging-map" />
        <div className="add-belonging-map-actions">
          {!hasGeoapifyApiKey() && (
            <p className="add-belonging-muted">
              Using OpenStreetMap tiles. Add a Geoapify key for branded map tiles.
            </p>
          )}
          {selected && (
            <p className="add-belonging-coords">
              Lat {selected[0].toFixed(5)}, Lng {selected[1].toFixed(5)}
            </p>
          )}
          {localError && <p className="field-error">{localError}</p>}
          <button
            type="button"
            className="btn btn-secondary btn-block"
            disabled={loadingLocation}
            onClick={useMyLocation}
          >
            {loadingLocation ? 'Locating…' : 'Use my location'}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => {
              if (!selected) {
                setLocalError('Tap the map to set your location')
                return
              }
              onConfirm(selected[0], selected[1])
            }}
          >
            Confirm location
          </button>
        </div>
      </div>
    </div>
  )
}
