import { Link } from 'react-router'

export function NotFound() {
  return (
    <section className="placeholder container">
      <p className="eyebrow">404</p>
      <h1 className="section-title">Page not found</h1>
      <p>The page you're looking for doesn't exist or has been moved.</p>
      <Link to="/" className="btn btn-primary">
        Back to Home
      </Link>
    </section>
  )
}
