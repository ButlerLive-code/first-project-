import type { Locale } from '../i18n/locales'
import { ruPlaceNames } from './servers.ru'

export type Region = 'americas' | 'europe' | 'apac' | 'mea'

export interface Server {
  id: string
  country: string
  countrySlug: string
  city: string
  flag: string
  region: Region
  ping: number
  load: number
  premium: boolean
}

export const regions: Region[] = ['americas', 'europe', 'apac', 'mea']

type Row = [id: string, country: string, city: string, flag: string, region: Region, ping: number, load: number, premium: boolean]

const rows: Row[] = [
  ['us-ny', 'United States', 'New York', '🇺🇸', 'americas', 92, 64, false],
  ['us-la', 'United States', 'Los Angeles', '🇺🇸', 'americas', 148, 41, true],
  ['us-mia', 'United States', 'Miami', '🇺🇸', 'americas', 118, 37, true],
  ['ca-tor', 'Canada', 'Toronto', '🇨🇦', 'americas', 101, 33, false],
  ['br-sao', 'Brazil', 'São Paulo', '🇧🇷', 'americas', 196, 46, true],
  ['mx-mex', 'Mexico', 'Mexico City', '🇲🇽', 'americas', 154, 28, true],
  ['de-fra', 'Germany', 'Frankfurt', '🇩🇪', 'europe', 28, 57, false],
  ['de-ber', 'Germany', 'Berlin', '🇩🇪', 'europe', 26, 44, true],
  ['nl-ams', 'Netherlands', 'Amsterdam', '🇳🇱', 'europe', 31, 72, false],
  ['gb-lon', 'United Kingdom', 'London', '🇬🇧', 'europe', 39, 48, true],
  ['fr-par', 'France', 'Paris', '🇫🇷', 'europe', 35, 51, false],
  ['pl-waw', 'Poland', 'Warsaw', '🇵🇱', 'europe', 22, 35, false],
  ['se-sto', 'Sweden', 'Stockholm', '🇸🇪', 'europe', 41, 24, true],
  ['es-mad', 'Spain', 'Madrid', '🇪🇸', 'europe', 47, 39, true],
  ['jp-tyo', 'Japan', 'Tokyo', '🇯🇵', 'apac', 214, 29, true],
  ['sg-sin', 'Singapore', 'Singapore', '🇸🇬', 'apac', 187, 53, true],
  ['kr-sel', 'South Korea', 'Seoul', '🇰🇷', 'apac', 226, 38, true],
  ['cn-hk', 'Hong Kong', 'Hong Kong', '🇭🇰', 'apac', 201, 61, true],
  ['in-mum', 'India', 'Mumbai', '🇮🇳', 'apac', 163, 58, true],
  ['au-syd', 'Australia', 'Sydney', '🇦🇺', 'apac', 289, 22, true],
  ['us-chi', 'United States', 'Chicago', '🇺🇸', 'americas', 104, 52, false],
  ['us-sea', 'United States', 'Seattle', '🇺🇸', 'americas', 156, 34, true],
  ['us-dal', 'United States', 'Dallas', '🇺🇸', 'americas', 127, 43, true],
  ['ca-van', 'Canada', 'Vancouver', '🇨🇦', 'americas', 161, 27, true],
  ['ca-mtl', 'Canada', 'Montreal', '🇨🇦', 'americas', 97, 31, true],
  ['ar-bue', 'Argentina', 'Buenos Aires', '🇦🇷', 'americas', 228, 33, true],
  ['cl-scl', 'Chile', 'Santiago', '🇨🇱', 'americas', 241, 21, true],
  ['co-bog', 'Colombia', 'Bogotá', '🇨🇴', 'americas', 182, 25, true],
  ['de-muc', 'Germany', 'Munich', '🇩🇪', 'europe', 30, 38, true],
  ['gb-man', 'United Kingdom', 'Manchester', '🇬🇧', 'europe', 42, 29, false],
  ['fr-mrs', 'France', 'Marseille', '🇫🇷', 'europe', 44, 26, true],
  ['it-mil', 'Italy', 'Milan', '🇮🇹', 'europe', 36, 47, false],
  ['ch-zrh', 'Switzerland', 'Zurich', '🇨🇭', 'europe', 33, 42, true],
  ['at-vie', 'Austria', 'Vienna', '🇦🇹', 'europe', 25, 36, true],
  ['cz-prg', 'Czechia', 'Prague', '🇨🇿', 'europe', 21, 32, true],
  ['no-osl', 'Norway', 'Oslo', '🇳🇴', 'europe', 45, 18, true],
  ['fi-hel', 'Finland', 'Helsinki', '🇫🇮', 'europe', 37, 23, true],
  ['ie-dub', 'Ireland', 'Dublin', '🇮🇪', 'europe', 49, 34, true],
  ['pt-lis', 'Portugal', 'Lisbon', '🇵🇹', 'europe', 58, 28, true],
  ['pl-krk', 'Poland', 'Kraków', '🇵🇱', 'europe', 24, 27, true],
  ['tr-ist', 'Turkey', 'Istanbul', '🇹🇷', 'europe', 63, 49, true],
  ['jp-osa', 'Japan', 'Osaka', '🇯🇵', 'apac', 219, 24, true],
  ['tw-tpe', 'Taiwan', 'Taipei', '🇹🇼', 'apac', 208, 35, true],
  ['th-bkk', 'Thailand', 'Bangkok', '🇹🇭', 'apac', 192, 41, true],
  ['id-jkt', 'Indonesia', 'Jakarta', '🇮🇩', 'apac', 205, 37, true],
  ['au-mel', 'Australia', 'Melbourne', '🇦🇺', 'apac', 294, 26, true],
  ['nz-akl', 'New Zealand', 'Auckland', '🇳🇿', 'apac', 312, 17, true],
  ['il-tlv', 'Israel', 'Tel Aviv', '🇮🇱', 'mea', 81, 39, true],
  ['eg-cai', 'Egypt', 'Cairo', '🇪🇬', 'mea', 94, 31, true],
  ['ke-nbo', 'Kenya', 'Nairobi', '🇰🇪', 'mea', 167, 22, true],
  ['ae-dxb', 'United Arab Emirates', 'Dubai', '🇦🇪', 'mea', 112, 31, true],
  ['za-jnb', 'South Africa', 'Johannesburg', '🇿🇦', 'mea', 176, 19, true],
  ['ng-los', 'Nigeria', 'Lagos', '🇳🇬', 'mea', 159, 26, true],
]

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')

export const servers: Server[] = rows.map(([id, country, city, flag, region, ping, load, premium]) => ({
  id,
  country,
  countrySlug: slugify(country),
  city,
  flag,
  region,
  ping,
  load,
  premium,
}))

export interface Country {
  slug: string
  name: string
  flag: string
  region: Region
  servers: Server[]
  bestPing: number
  freeAvailable: boolean
}

export const countries: Country[] = Object.values(
  servers.reduce<Record<string, Server[]>>((acc, s) => {
    ;(acc[s.countrySlug] ??= []).push(s)
    return acc
  }, {}),
)
  .map((list) => ({
    slug: list[0].countrySlug,
    name: list[0].country,
    flag: list[0].flag,
    region: list[0].region,
    servers: list,
    bestPing: Math.min(...list.map((s) => s.ping)),
    freeAvailable: list.some((s) => !s.premium),
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'en'))

export function getCountry(slug: string | undefined) {
  return countries.find((c) => c.slug === slug)
}

// Country or city name in the page language; English names double as keys.
export function placeName(name: string, locale: Locale) {
  return locale === 'ru' ? (ruPlaceNames[name] ?? name) : name
}

// Case-insensitive search over the English and Russian city and country names.
export function matchesQuery(server: Server, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [server.city, server.country, ruPlaceNames[server.city], ruPlaceNames[server.country]].some(
    (name) => name?.toLowerCase().includes(q),
  )
}

export function countryMatches(country: Country, query: string) {
  return matchesQuery({ ...country.servers[0], city: '' }, query)
}
