import { Link } from 'react-router'
import hero from '../assets/hero.svg'
import iconUser from '../assets/icon-user.svg'
import iconLocation from '../assets/icon-location.svg'
import iconServer from '../assets/icon-server.svg'

const stats = [
  { icon: iconUser, value: '90+', label: 'Users' },
  { icon: iconLocation, value: '30+', label: 'Locations' },
  { icon: iconServer, value: '50+', label: 'Servers' },
]

export function Hero() {
  return (
    <section className="hero container" id="about">
      <div className="hero-content">
        <h1 className="hero-title">
          Want anything to be easy with <strong>LaslesVPN.</strong>
        </h1>
        <p className="hero-text">
          Provide a network for all your needs with ease and fun using <b>LaslesVPN</b> discover
          interesting features from us.
        </p>
        <Link to="/signup" className="btn btn-primary hero-cta">
          Get Started
        </Link>
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
