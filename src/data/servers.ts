export type Region = 'Americas' | 'Europe' | 'Asia Pacific' | 'Africa & Middle East'

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

export const regions: Region[] = ['Americas', 'Europe', 'Asia Pacific', 'Africa & Middle East']

type Row = [id: string, country: string, city: string, flag: string, region: Region, ping: number, load: number, premium: boolean]

const rows: Row[] = [
  ['us-ny', 'United States', 'New York', '🇺🇸', 'Americas', 92, 64, false],
  ['us-la', 'United States', 'Los Angeles', '🇺🇸', 'Americas', 148, 41, true],
  ['us-mia', 'United States', 'Miami', '🇺🇸', 'Americas', 118, 37, true],
  ['ca-tor', 'Canada', 'Toronto', '🇨🇦', 'Americas', 101, 33, false],
  ['br-sao', 'Brazil', 'São Paulo', '🇧🇷', 'Americas', 196, 46, true],
  ['mx-mex', 'Mexico', 'Mexico City', '🇲🇽', 'Americas', 154, 28, true],
  ['de-fra', 'Germany', 'Frankfurt', '🇩🇪', 'Europe', 28, 57, false],
  ['de-ber', 'Germany', 'Berlin', '🇩🇪', 'Europe', 26, 44, true],
  ['nl-ams', 'Netherlands', 'Amsterdam', '🇳🇱', 'Europe', 31, 72, false],
  ['gb-lon', 'United Kingdom', 'London', '🇬🇧', 'Europe', 39, 48, true],
  ['fr-par', 'France', 'Paris', '🇫🇷', 'Europe', 35, 51, false],
  ['pl-waw', 'Poland', 'Warsaw', '🇵🇱', 'Europe', 22, 35, false],
  ['se-sto', 'Sweden', 'Stockholm', '🇸🇪', 'Europe', 41, 24, true],
  ['es-mad', 'Spain', 'Madrid', '🇪🇸', 'Europe', 47, 39, true],
  ['jp-tyo', 'Japan', 'Tokyo', '🇯🇵', 'Asia Pacific', 214, 29, true],
  ['sg-sin', 'Singapore', 'Singapore', '🇸🇬', 'Asia Pacific', 187, 53, true],
  ['kr-sel', 'South Korea', 'Seoul', '🇰🇷', 'Asia Pacific', 226, 38, true],
  ['cn-hk', 'Hong Kong', 'Hong Kong', '🇭🇰', 'Asia Pacific', 201, 61, true],
  ['in-mum', 'India', 'Mumbai', '🇮🇳', 'Asia Pacific', 163, 58, true],
  ['au-syd', 'Australia', 'Sydney', '🇦🇺', 'Asia Pacific', 289, 22, true],
  ['us-chi', 'United States', 'Chicago', '🇺🇸', 'Americas', 104, 52, false],
  ['us-sea', 'United States', 'Seattle', '🇺🇸', 'Americas', 156, 34, true],
  ['us-dal', 'United States', 'Dallas', '🇺🇸', 'Americas', 127, 43, true],
  ['ca-van', 'Canada', 'Vancouver', '🇨🇦', 'Americas', 161, 27, true],
  ['ca-mtl', 'Canada', 'Montreal', '🇨🇦', 'Americas', 97, 31, true],
  ['ar-bue', 'Argentina', 'Buenos Aires', '🇦🇷', 'Americas', 228, 33, true],
  ['cl-scl', 'Chile', 'Santiago', '🇨🇱', 'Americas', 241, 21, true],
  ['co-bog', 'Colombia', 'Bogotá', '🇨🇴', 'Americas', 182, 25, true],
  ['de-muc', 'Germany', 'Munich', '🇩🇪', 'Europe', 30, 38, true],
  ['gb-man', 'United Kingdom', 'Manchester', '🇬🇧', 'Europe', 42, 29, false],
  ['fr-mrs', 'France', 'Marseille', '🇫🇷', 'Europe', 44, 26, true],
  ['it-mil', 'Italy', 'Milan', '🇮🇹', 'Europe', 36, 47, false],
  ['ch-zrh', 'Switzerland', 'Zurich', '🇨🇭', 'Europe', 33, 42, true],
  ['at-vie', 'Austria', 'Vienna', '🇦🇹', 'Europe', 25, 36, true],
  ['cz-prg', 'Czechia', 'Prague', '🇨🇿', 'Europe', 21, 32, true],
  ['no-osl', 'Norway', 'Oslo', '🇳🇴', 'Europe', 45, 18, true],
  ['fi-hel', 'Finland', 'Helsinki', '🇫🇮', 'Europe', 37, 23, true],
  ['ie-dub', 'Ireland', 'Dublin', '🇮🇪', 'Europe', 49, 34, true],
  ['pt-lis', 'Portugal', 'Lisbon', '🇵🇹', 'Europe', 58, 28, true],
  ['pl-krk', 'Poland', 'Kraków', '🇵🇱', 'Europe', 24, 27, true],
  ['tr-ist', 'Turkey', 'Istanbul', '🇹🇷', 'Europe', 63, 49, true],
  ['jp-osa', 'Japan', 'Osaka', '🇯🇵', 'Asia Pacific', 219, 24, true],
  ['tw-tpe', 'Taiwan', 'Taipei', '🇹🇼', 'Asia Pacific', 208, 35, true],
  ['th-bkk', 'Thailand', 'Bangkok', '🇹🇭', 'Asia Pacific', 192, 41, true],
  ['id-jkt', 'Indonesia', 'Jakarta', '🇮🇩', 'Asia Pacific', 205, 37, true],
  ['au-mel', 'Australia', 'Melbourne', '🇦🇺', 'Asia Pacific', 294, 26, true],
  ['nz-akl', 'New Zealand', 'Auckland', '🇳🇿', 'Asia Pacific', 312, 17, true],
  ['il-tlv', 'Israel', 'Tel Aviv', '🇮🇱', 'Africa & Middle East', 81, 39, true],
  ['eg-cai', 'Egypt', 'Cairo', '🇪🇬', 'Africa & Middle East', 94, 31, true],
  ['ke-nbo', 'Kenya', 'Nairobi', '🇰🇪', 'Africa & Middle East', 167, 22, true],
  ['ae-dxb', 'United Arab Emirates', 'Dubai', '🇦🇪', 'Africa & Middle East', 112, 31, true],
  ['za-jnb', 'South Africa', 'Johannesburg', '🇿🇦', 'Africa & Middle East', 176, 19, true],
  ['ng-los', 'Nigeria', 'Lagos', '🇳🇬', 'Africa & Middle East', 159, 26, true],
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
  .sort((a, b) => a.name.localeCompare(b.name))

export function getCountry(slug: string | undefined) {
  return countries.find((c) => c.slug === slug)
}
