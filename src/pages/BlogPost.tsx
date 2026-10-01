import { useParams } from 'react-router'
import { LocalLink } from '../i18n/LocalLink'
import { getPost, getPosts, type Post } from '../data/blog'
import { formatDate } from '../i18n/format'
import { useLocale } from '../i18n/useLocale'
import { usePageMeta } from '../i18n/usePageMeta'
import { useT } from '../i18n/useT'
import { NotFound } from './NotFound'

export function BlogPost() {
  const { slug } = useParams()
  const locale = useLocale()
  const post = getPost(slug, locale)
  if (!post) return <NotFound />
  return <BlogArticle post={post} />
}

// Split out so the page meta hook only runs for a post that exists.
function BlogArticle({ post }: { post: Post }) {
  const t = useT()
  const locale = useLocale()
  usePageMeta(post.title, post.excerpt)

  const related = getPosts(locale)
    .filter((p) => p.slug !== post.slug)
    .sort((a, b) => Number(b.category === post.category) - Number(a.category === post.category))
    .slice(0, 3)

  return (
    <>
      <article className="container article">
        <LocalLink to="/blog" className="back-link">
          {t.blogPost.back}
        </LocalLink>
        <p className="post-meta">
          <span className="badge">{t.blog.categories[post.category]}</span>{' '}
          {formatDate(post.date, locale)} · {t.blog.readTime(post.readMinutes)}
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
          <p>{t.blogPost.cta}</p>
          <LocalLink to="/#pricing" className="btn btn-primary">
            {t.blogPost.ctaButton}
          </LocalLink>
        </div>
      </article>

      <section className="container page-section related">
        <h2 className="subheading">{t.blogPost.keepReading}</h2>
        <ul className="post-grid">
          {related.map((p) => (
            <li key={p.slug}>
              <LocalLink to={`/blog/${p.slug}`} className="card post-card quick-link">
                <span className="post-cover" aria-hidden="true">
                  {p.emoji}
                </span>
                <span className="post-meta">
                  <span className="badge">{t.blog.categories[p.category]}</span>{' '}
                  {t.blog.readTime(p.readMinutes)}
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
