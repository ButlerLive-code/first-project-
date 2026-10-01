import { LocalLink } from '../i18n/LocalLink'
import { PageHeader } from '../components/PageHeader'
import { usePageMeta } from '../i18n/usePageMeta'
import { useT } from '../i18n/useT'

const benefitIcons = ['🛡️', '🕵️', '🌍', '⚡']

export function WhatIsVpn() {
  const t = useT()
  const w = t.whatIsVpn
  usePageMeta(w.metaTitle)

  return (
    <>
      <PageHeader eyebrow={w.eyebrow} title={w.title}>
        {w.text}
      </PageHeader>

      <section className="container page-section">
        <ol className="flow" aria-label={w.flowLabel}>
          <li className="flow-node">
            <span aria-hidden="true">💻</span>
            <b>{w.device}</b>
            <small>{w.deviceText}</small>
          </li>
          <li className="flow-link" aria-hidden="true">
            <span>🔒 {w.tunnel}</span>
          </li>
          <li className="flow-node flow-node-accent">
            <span aria-hidden="true">🛡️</span>
            <b>{w.server}</b>
            <small>{w.serverText}</small>
          </li>
          <li className="flow-link" aria-hidden="true">
            <span>🌐 {w.privateIp}</span>
          </li>
          <li className="flow-node">
            <span aria-hidden="true">🌍</span>
            <b>{w.internet}</b>
            <small>{w.internetText}</small>
          </li>
        </ol>

        <h2 className="subheading">{w.compareTitle}</h2>
        <div className="table-wrap">
          <table className="table compare">
            <thead>
              <tr>
                <th />
                <th>{w.without}</th>
                <th>{w.withVpn}</th>
              </tr>
            </thead>
            <tbody>
              {w.comparison.map(([label, without, withVpn]) => (
                <tr key={label}>
                  <td>
                    <b>{label}</b>
                  </td>
                  <td className="compare-bad">✕ {without}</td>
                  <td className="compare-good">✓ {withVpn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="subheading">{w.benefitsTitle}</h2>
        <ul className="benefit-grid">
          {w.benefits.map((b, i) => (
            <li key={b.title} className="card benefit">
              <span className="platform-icon" aria-hidden="true">
                {benefitIcons[i]}
              </span>
              <h3 className="card-title">{b.title}</h3>
              <p>{b.text}</p>
            </li>
          ))}
        </ul>

        <div className="page-actions">
          <LocalLink to="/#pricing" className="btn btn-primary">
            {w.choosePlan}
          </LocalLink>
          <LocalLink to="/faq" className="btn btn-outline">
            {w.faq}
          </LocalLink>
        </div>
      </section>
    </>
  )
}
