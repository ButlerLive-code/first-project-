import { expect, it } from 'vitest'
import { en } from '../i18n/en'
import { ru } from '../i18n/ru'
import { categories, getPost, getPosts } from './blog'

it('every post exists in both languages with the same metadata', () => {
  const enPosts = getPosts('en')
  const ruPosts = getPosts('ru')
  expect(ruPosts.map((p) => [p.slug, p.date, p.category])).toEqual(enPosts.map((p) => [p.slug, p.date, p.category]))
  ruPosts.forEach((p, i) => {
    expect(p.title).not.toBe(enPosts[i].title)
    expect(p.body.length).toBeGreaterThan(0)
  })
})

it('every category has a label', () => {
  for (const c of categories) {
    expect(en.blog.categories[c]).toBeTruthy()
    expect(ru.blog.categories[c]).toBeTruthy()
  }
})

it('unknown slug is undefined', () => {
  expect(getPost('nope', 'ru')).toBeUndefined()
})
