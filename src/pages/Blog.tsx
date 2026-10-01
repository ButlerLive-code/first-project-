import { useState } from 'react'
import { LocalLink } from '../i18n/LocalLink'
import { PageHeader } from '../components/PageHeader'
import { categories, formatDate, posts } from '../data/blog'

export function Blog() {
  const [category, setCategory] = useState<(typeof categories)[number]>('All')
  const visible = posts.filter((p) => category === 'All' || p.category === category)
  const [featured, ...rest] = visible

  return (
    <>
      <PageHeader eyebrow="Blog" title="Stories, guides & product news">
        Tips to stay private online, setup guides and the latest from the LaslesVPN team.
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
              {c}
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
                <span className="badge">{featured.category}</span> {formatDate(featured.date)} ·{' '}
                {featured.readMinutes} min read
              </span>
              <span className="post-title post-title-lg">{featured.title}</span>
              <span>{featured.excerpt}</span>
              <span className="platform-guide">Read article →</span>
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
                  <span className="badge">{post.category}</span> {post.readMinutes} min read
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
