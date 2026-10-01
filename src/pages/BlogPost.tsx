import { useParams } from 'react-router'
import { LocalLink } from '../i18n/LocalLink'
import { formatDate, getPost, posts } from '../data/blog'
import { NotFound } from './NotFound'

export function BlogPost() {
  const { slug } = useParams()
  const post = getPost(slug)
  if (!post) return <NotFound />

  const related = posts
    .filter((p) => p.slug !== post.slug)
    .sort((a, b) => Number(b.category === post.category) - Number(a.category === post.category))
    .slice(0, 3)

  return (
    <>
      <article className="container article">
        <LocalLink to="/blog" className="back-link">
          ← All articles
        </LocalLink>
        <p className="post-meta">
          <span className="badge">{post.category}</span> {formatDate(post.date)} · {post.readMinutes}{' '}
          min read
        </p>
        <h1 className="page-title article-title">{post.title}</h1>
        <p className="article-lead">{post.excerpt}</p>
        <div className="post-cover post-cover-hero" aria-hidden="true">
          {post.emoji}
        </div>
        {post.body.map((paragraph) => (
          <p key={paragraph} className="article-p">
            {paragraph}
          </p>
        ))}

        <div className="notice page-cta">
          <p>Ready to put this into practice? Start with the Free plan — no card required.</p>
          <LocalLink to="/#pricing" className="btn btn-primary">
            Get LaslesVPN
          </LocalLink>
        </div>
      </article>

      <section className="container page-section related">
        <h2 className="subheading">Keep reading</h2>
        <ul className="post-grid">
          {related.map((p) => (
            <li key={p.slug}>
              <LocalLink to={`/blog/${p.slug}`} className="card post-card quick-link">
                <span className="post-cover" aria-hidden="true">
                  {p.emoji}
                </span>
                <span className="post-meta">
                  <span className="badge">{p.category}</span> {p.readMinutes} min read
                </span>
                <span className="post-title">{p.title}</span>
              </LocalLink>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
