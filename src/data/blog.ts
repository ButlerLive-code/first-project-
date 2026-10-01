import type { Locale } from '../i18n/locales'
import { postText as enText } from './blog.en'
import { postText as ruText } from './blog.ru'

// Dates, categories and read times are shared by every language; only the text differs.
export const postMeta = [
  { slug: 'public-wifi-risks', category: 'privacy', date: '2026-09-18', readMinutes: 5, emoji: '☕' },
  { slug: 'choose-fastest-server', category: 'guides', date: '2026-09-04', readMinutes: 4, emoji: '⚡' },
  { slug: 'laslesvpn-4-2', category: 'product', date: '2026-08-21', readMinutes: 3, emoji: '🚀' },
  { slug: 'travel-vpn-checklist', category: 'travel', date: '2026-07-30', readMinutes: 6, emoji: '✈️' },
  { slug: 'no-logs-explained', category: 'privacy', date: '2026-07-12', readMinutes: 7, emoji: '🔒' },
  { slug: 'vpn-on-router', category: 'guides', date: '2026-06-27', readMinutes: 8, emoji: '📡' },
] as const

export type PostSlug = (typeof postMeta)[number]['slug']
export type Category = 'privacy' | 'guides' | 'product' | 'travel'
export const categories = ['all', 'privacy', 'guides', 'product', 'travel'] as const

export interface PostText {
  title: string
  excerpt: string
  body: string[]
}

export interface Post extends PostText {
  slug: PostSlug
  category: Category
  date: string
  readMinutes: number
  emoji: string
}

const texts: Record<Locale, Record<PostSlug, PostText>> = { en: enText, ru: ruText }

export function getPosts(locale: Locale): Post[] {
  return postMeta.map((meta) => ({ ...meta, ...texts[locale][meta.slug] }))
}

export function getPost(slug: string | undefined, locale: Locale) {
  return getPosts(locale).find((p) => p.slug === slug)
}
