import { LocalLink } from '../i18n/LocalLink'
import { useT } from '../i18n/useT'
import hero from '../assets/hero.svg'
import iconUser from '../assets/icon-user.svg'
import iconLocation from '../assets/icon-location.svg'
import iconServer from '../assets/icon-server.svg'

export function Hero() {
  const t = useT()
  const stats = [
    { icon: iconUser, value: '90+', label: t.hero.users },
    { icon: iconLocation, value: '30+', label: t.hero.locations },
    { icon: iconServer, value: '50+', label: t.hero.servers },
  ]

  return (
    <section className="hero container" id="about">
      <div className="hero-content">
        <h1 className="hero-title">
          {t.hero.titleBefore}
          <strong>LaslesVPN.</strong>{/* i18n-ignore */}
        </h1>
        <p className="hero-text">
          {t.hero.textBefore}
          <b>LaslesVPN</b>{/* i18n-ignore */}
          {t.hero.textAfter}
        </p>
        <LocalLink to="/signup" className="btn btn-primary hero-cta">
          {t.hero.cta}
        </LocalLink>
      </div>
      <img className="hero-image" src={hero} alt="" width={611} height={382} />

      <ul className="stats">
        {stats.map((stat) => (
          <li key={stat.label} className="stat">
            <img src={stat.icon} alt="" width={55} height={55} />
            <div>
              <p className="stat-value">{stat.value}</p>
              <p className="stat-label">{stat.label}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
