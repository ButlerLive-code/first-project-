import type { PlatformId } from '../../shared/api'
import type { Locale } from '../i18n/locales'
import { platformText as enText } from './platforms.en'
import { platformText as ruText } from './platforms.ru'

// The ids are shared with the API server, which validates device platforms.
export type { PlatformId }

export interface PlatformText {
  requirements: string
  steps: { title: string; text: string }[]
  troubleshooting: { problem: string; fix: string }[]
}

export interface PlatformMeta {
  id: PlatformId
  name: string
  icon: string
  version: string
  sizeMb: number
  file: string
}

export interface Platform extends PlatformMeta, PlatformText {}

// Names, versions and file names stay in English in every language.
const platformMeta: PlatformMeta[] = [
  { id: 'windows', name: 'Windows', icon: '🪟', version: '4.2.1', sizeMb: 48, file: 'LaslesVPN-Setup-4.2.1.exe' },
  { id: 'macos', name: 'macOS', icon: '🍎', version: '4.2.0', sizeMb: 41, file: 'LaslesVPN-4.2.0.dmg' },
  { id: 'ios', name: 'iOS', icon: '📱', version: '4.1.8', sizeMb: 36, file: 'App Store' },
  { id: 'android', name: 'Android', icon: '🤖', version: '4.1.9', sizeMb: 29, file: 'Google Play' },
  { id: 'linux', name: 'Linux', icon: '🐧', version: '4.0.3', sizeMb: 22, file: 'laslesvpn_4.0.3_amd64.deb' },
]

const texts: Record<Locale, Record<PlatformId, PlatformText>> = { en: enText, ru: ruText }

export function getPlatforms(locale: Locale): Platform[] {
  return platformMeta.map((meta) => ({ ...meta, ...texts[locale][meta.id] }))
}

export function getPlatform(id: string | undefined, locale: Locale) {
  return getPlatforms(locale).find((p) => p.id === id)
}

export function detectPlatform(): string {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  if (/Mac/.test(ua)) return 'macos'
  if (/Linux/.test(ua)) return 'linux'
  return 'windows'
}
