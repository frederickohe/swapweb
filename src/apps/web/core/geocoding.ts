import { getAppConfig } from './appConfig'

function displayAreaFromProperties(props: Record<string, unknown>): string | null {
  const parts: string[] = []
  for (const key of ['suburb', 'district', 'neighbourhood', 'city']) {
    const val = String(props[key] ?? '').trim()
    if (val && !parts.includes(val)) parts.push(val)
    if (parts.length >= 2) break
  }
  if (parts.length === 0) {
    for (const key of ['city', 'county', 'state', 'country']) {
      const val = String(props[key] ?? '').trim()
      if (val) {
        parts.push(val)
        break
      }
    }
  }
  return parts.length === 0 ? null : parts.join(', ')
}

/** Suburb/city-level label from coordinates (Geoapify). */
export async function reverseGeocodeArea(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const apiKey = getAppConfig().geoapifyApiKey.trim()
  if (!apiKey) return null

  const url = new URL('https://api.geoapify.com/v1/geocode/reverse')
  url.searchParams.set('lat', String(latitude))
  url.searchParams.set('lon', String(longitude))
  url.searchParams.set('apiKey', apiKey)
  url.searchParams.set('lang', 'en')

  try {
    const response = await fetch(url.toString())
    if (!response.ok) return null
    const payload = (await response.json()) as {
      features?: Array<{ properties?: Record<string, unknown> }>
    }
    const props = payload.features?.[0]?.properties
    if (!props) return null
    return displayAreaFromProperties(props)
  } catch {
    return null
  }
}
