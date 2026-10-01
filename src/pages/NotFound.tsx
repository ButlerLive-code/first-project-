import { LocalLink } from '../i18n/LocalLink'
import { usePageMeta } from '../i18n/usePageMeta'
import { useT } from '../i18n/useT'

export function NotFound() {
  const t = useT()
  usePageMeta(t.notFound.metaTitle)
  return (
    <section className="placeholder container">
      <p className="eyebrow">404</p>
      <h1 className="section-title">{t.notFound.title}</h1>
      <p>{t.notFound.text}</p>
      <LocalLink to="/" className="btn btn-primary">
        {t.notFound.back}
      </LocalLink>
    </section>
  )
}
