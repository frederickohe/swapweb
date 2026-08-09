export interface LoginRequest {
  email: string
  password: string
}

export interface SignupRequest {
  fullname: string
  email: string
  password: string
  phone?: string
}

export interface UserProfile {
  id: string
  full_name: string
  email: string
  phone: string | null
  role: string
  profile_picture_url: string | null
  location: string | null
  ghana_card: string | null
  nationality: string | null
  date_of_birth: string | null
  gender: string | null
  staff_id: string | null
  company: string | null
  current_branch: string | null
  address: string | null
  whatsapp_number: string | null
  facebook_url: string | null
  linkedin_url: string | null
  twitter_url: string | null
  instagram_url: string | null
}

export interface UpdateProfileRequest {
  fullname?: string
  phone?: string | null
  ghana_card?: string | null
  nationality?: string | null
  date_of_birth?: string | null
  gender?: string | null
  staff_id?: string | null
  company?: string | null
  current_branch?: string | null
  address?: string | null
  location?: string | null
  whatsapp_number?: string | null
  facebook_url?: string | null
  linkedin_url?: string | null
  twitter_url?: string | null
  instagram_url?: string | null
}

export interface Listing {
  id: string
  title: string
  description: string
  category: string
  condition: string
  location: string
  estimated_value: number | null
  images: string[]
  status?: string
  owner_fullname?: string | null
  user_id?: string
  primary_image_url?: string
}

export interface ListingSearchResponse {
  items: Listing[]
  total: number
  page: number
  size: number
}

export interface CreateListingRequest {
  title: string
  description: string
  category: string
  condition: string
  estimated_value: number
  primary_image_url: string
  image_urls?: string[]
  serial_number?: string
  build_version?: string
  ownership_documents_available?: boolean
  wishlist?: Array<{ category?: string; description?: string }>
  wish_finding?: boolean
  budget_negotiation?: boolean
  budget_amount?: number
  collection_assistance?: boolean
  location_lat?: number
  location_lng?: number
  location_area?: string
}

export interface SwapRequest {
  id: string
  status: string
  swapStatus: string | null
  title: string
  subtitle: string
  price: string
  imageUrl: string | null
  isInitiator: boolean
  isOwner: boolean
  owner_approved?: boolean
  initiator_fee_paid?: boolean
  owner_fee_paid?: boolean
  feeAmount: number
  raw: Record<string, unknown>
}

export interface MeetupListing {
  id: string
  title: string
  location_lat: number | null
  location_lng: number | null
}

export interface MeetupDetails {
  swap_request_id: string
  swap_status: string
  hub_name: string
  counterparty: {
    fullname: string
    phone: string
    email: string
  }
  counterparty_listing: MeetupListing | null
  your_listing: MeetupListing | null
}

export interface AppNotification {
  id: string
  title: string
  body: string
  createdAt: string | null
  read: boolean
}

export const LISTING_CATEGORIES = [
  'Electronics',
  'Home & Kitchen',
  'kids',
  'Books',
  'Fashion',
  'Sports',
  'Tools',
  'Fitness',
  'Beauty Products',
  'Vehicles',
  'Vehicle Parts',
  'Personal Care',
  'Media',
  'Video Games',
] as const

export const LISTING_CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor'] as const

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function pickNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim()) {
      const n = Number(value)
      if (Number.isFinite(n)) return n
    }
  }
  return null
}

function extractImageUrls(raw: Record<string, unknown>): string[] {
  const urls: string[] = []
  const push = (value: unknown) => {
    if (typeof value === 'string' && value.trim()) {
      urls.push(value.trim())
    }
  }

  push(raw.primary_image_url)
  push(raw.image_url)
  push(raw.cover_image)

  const arrays = [raw.images, raw.image_urls, raw.photos]
  for (const arr of arrays) {
    if (!Array.isArray(arr)) continue
    for (const item of arr) {
      if (typeof item === 'string') {
        push(item)
      } else {
        const rec = asRecord(item)
        if (rec) push(rec.url ?? rec.image_url ?? rec.src)
      }
    }
  }

  if (Array.isArray(raw.media)) {
    for (const item of raw.media) {
      const rec = asRecord(item)
      if (rec) push(rec.url ?? rec.image_url ?? rec.src)
    }
  }

  return [...new Set(urls)]
}

export function normalizeListing(raw: unknown): Listing {
  const r = asRecord(raw) ?? {}
  const images = extractImageUrls(r)
  return {
    id: pickString(r.id, r.listing_id) || String(r.id ?? ''),
    title: pickString(r.title, r.name, r.label) || 'Untitled',
    description: pickString(r.description) || '',
    category: pickString(r.category) || '',
    condition: pickString(r.condition) || '',
    location: pickString(r.location_area, r.location, r.area) || '',
    estimated_value: pickNumber(r.estimated_value, r.price, r.value),
    images,
    status: pickString(r.status) || undefined,
    owner_fullname: pickString(r.owner_fullname, r.fullname) || null,
    user_id: pickString(r.user_id) || undefined,
    primary_image_url: images[0],
  }
}

export function normalizeUser(raw: unknown): UserProfile {
  const r = asRecord(raw) ?? {}
  const ghana = pickString(r.ghana_card)
  const location = pickString(r.location, r.address, r.location_area)
  return {
    id: String(r.id ?? ''),
    full_name: pickString(r.fullname, r.full_name, r.name) || 'Member',
    email: pickString(r.email),
    phone: (r.phone as string | null | undefined) ?? null,
    role: pickString(r.role).toUpperCase() || 'USER',
    profile_picture_url: (r.profile_picture_url as string | null | undefined) ?? null,
    location: location || null,
    ghana_card: ghana || null,
    nationality: pickString(r.nationality) || null,
    date_of_birth: pickString(r.date_of_birth) || null,
    gender: pickString(r.gender) || null,
    staff_id: pickString(r.staff_id) || null,
    company: pickString(r.company) || null,
    current_branch: pickString(r.current_branch) || null,
    address: pickString(r.address) || null,
    whatsapp_number: pickString(r.whatsapp_number) || null,
    facebook_url: pickString(r.facebook_url) || null,
    linkedin_url: pickString(r.linkedin_url) || null,
    twitter_url: pickString(r.twitter_url) || null,
    instagram_url: pickString(r.instagram_url) || null,
  }
}

function formatListingPrice(value: unknown): string {
  const n = pickNumber(value)
  if (n == null) return ''
  return `GH₵ ${n.toFixed(2)}`
}

function normalizeMeetupListing(raw: unknown): MeetupListing | null {
  const r = asRecord(raw)
  if (!r) return null
  const lat = pickNumber(r.location_lat)
  const lng = pickNumber(r.location_lng)
  return {
    id: pickString(r.id) || '',
    title: pickString(r.title, r.name) || 'Listing',
    location_lat: lat,
    location_lng: lng,
  }
}

export function normalizeMeetupDetails(raw: unknown): MeetupDetails {
  const r = asRecord(raw) ?? {}
  const party = asRecord(r.counterparty) ?? {}
  return {
    swap_request_id: pickString(r.swap_request_id, r.id) || '',
    swap_status: pickString(r.swap_status, r.status) || '',
    hub_name: pickString(r.hub_name) || '',
    counterparty: {
      fullname: pickString(party.fullname, party.name) || '',
      phone: pickString(party.phone) || '',
      email: pickString(party.email) || '',
    },
    counterparty_listing: normalizeMeetupListing(r.counterparty_listing),
    your_listing: normalizeMeetupListing(r.your_listing),
  }
}

function pickSwapStatus(r: Record<string, unknown>): string | null {
  const direct = pickString(r.swap_status)
  if (direct) return direct
  const swap = asRecord(r.swap)
  if (swap) {
    const nested = pickString(swap.status)
    if (nested) return nested
  }
  return null
}

export function normalizeSwapRequest(
  raw: unknown,
  currentUserId?: string,
): SwapRequest {
  const r = asRecord(raw) ?? {}
  const ownerListing = asRecord(r.owner_listing) ?? asRecord(r.target_listing)
  const initiatorListing = asRecord(r.initiator_listing) ?? asRecord(r.offer_listing)
  const initiatorId = pickString(r.initiator_id)
  const ownerId = pickString(r.owner_id)
  const isInitiator = !!currentUserId && initiatorId === currentUserId
  const isOwner = !!currentUserId && ownerId === currentUserId
  const displayListing = (isInitiator ? ownerListing : initiatorListing) ?? ownerListing ?? initiatorListing ?? r
  const images = extractImageUrls(displayListing)
  const category = pickString(displayListing.category)
  const condition = pickString(displayListing.condition)
  const fee = pickNumber(
    isInitiator ? r.initiator_fee_amount : r.owner_fee_amount,
    r.initiator_fee_amount,
    r.owner_fee_amount,
    r.fee_amount,
  )

  return {
    id: pickString(r.id, r.swap_request_id) || String(r.id ?? ''),
    status: pickString(r.effective_status, r.status) || 'unknown',
    swapStatus: pickSwapStatus(r),
    title: pickString(displayListing.title, displayListing.name, r.title) || 'Swap request',
    subtitle: category || condition || 'Listing',
    price: formatListingPrice(displayListing.estimated_value),
    imageUrl: images[0] ?? null,
    isInitiator,
    isOwner,
    owner_approved: r.owner_approved === true,
    initiator_fee_paid: r.initiator_fee_paid === true,
    owner_fee_paid: r.owner_fee_paid === true,
    feeAmount: fee ?? 0,
    raw: r,
  }
}

function notificationTruthy(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase()
    return s === 'true' || s === '1' || s === 'yes' || s === 'read'
  }
  return false
}

export function normalizeNotification(raw: unknown): AppNotification {
  const r = asRecord(raw) ?? {}
  const nested = asRecord(r.data) ?? {}
  const status = pickString(r.status, nested.status).toUpperCase()
  const readAt = pickString(r.read_at, r.readAt)
  const read =
    status === 'READ' ||
    !!readAt ||
    notificationTruthy(r.read ?? r.is_read ?? r.isRead)

  return {
    id: pickString(r.id, r._id, r.notification_id, r.notificationId) || String(r.id ?? ''),
    title:
      pickString(nested.title, nested.subject, r.title, r.subject, r.type) ||
      'Notification',
    body: pickString(
      nested.description,
      nested.body,
      nested.message,
      nested.content,
      r.body,
      r.message,
      r.content,
      r.detail,
    ),
    createdAt:
      pickString(r.created_at, r.createdAt, r.timestamp, r.time, nested.created_at) ||
      null,
    read,
  }
}
