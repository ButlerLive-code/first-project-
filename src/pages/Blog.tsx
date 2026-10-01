import { useState } from 'react'
import { LocalLink } from '../i18n/LocalLink'
import { PageHeader } from '../components/PageHeader'
import { categories, getPosts } from '../data/blog'
import { formatDate } from '../i18n/format'
import { useLocale } from '../i18n/useLocale'
import { usePageMeta } from '../i18n/usePageMeta'
import { useT } from '../i18n/useT'

export function Blog() {
  const t = useT()
  const locale = useLocale()
  usePageMeta(t.blog.metaTitle)
  const [category, setCategory] = useState<(typeof categories)[number]>('all')
  const visible = getPosts(locale).filter((p) => category === 'all' || p.category === category)
  const [featured, ...rest] = visible

  return (
    <>
      <PageHeader eyebrow={t.blog.eyebrow} title={t.blog.title}>
        {t.blog.text}
      </PageHeader>

      <section className="container page-section">
        <div className="chips blog-filter">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip${category === c ? ' is-active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {t.blog.categories[c]}
            </button>
          ))}
        </div>

        {featured && (
          <LocalLink to={`/blog/${featured.slug}`} className="card post-featured quick-link">
            <span className="post-cover post-cover-lg" aria-hidden="true">
              {featured.emoji}
            </span>
            <span className="post-body">
              <span className="post-meta">
                <span className="badge">{t.blog.categories[featured.category]}</span>{' '}
                {formatDate(featured.date, locale)} · {t.blog.readTime(featured.readMinutes)}
              </span>
              <span className="post-title post-title-lg">{featured.title}</span>
              <span>{featured.excerpt}</span>
              <span className="platform-guide">{t.blog.readArticle}</span>
            </span>
          </LocalLink>
        )}

        <ul className="post-grid">
          {rest.map((post) => (
            <li key={post.slug}>
              <LocalLink to={`/blog/${post.slug}`} className="card post-card quick-link">
                <span className="post-cover" aria-hidden="true">
                  {post.emoji}
                </span>
                <span className="post-meta">
                  <span className="badge">{t.blog.categories[post.category]}</span>{' '}
                  {t.blog.readTime(post.readMinutes)}
                </span>
                <span className="post-title">{post.title}</span>
                <span className="post-excerpt">{post.excerpt}</span>
              </LocalLink>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
