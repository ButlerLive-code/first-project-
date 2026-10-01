import { Link } from 'react-router'
import { PageHeader } from '../components/PageHeader'
import { countries, servers } from '../data/servers'

const values = [
  { icon: '🔐', title: 'Privacy first', text: 'We collect the minimum needed to run the service and never log your activity.' },
  { icon: '😊', title: 'Easy & fun', text: 'Security should not be complicated. One tap and you are protected.' },
  { icon: '🤝', title: 'Honest pricing', text: 'A real free plan, simple paid tiers, and you can cancel any time.' },
]

const team = [
  { name: 'Lena Laslo', role: 'Co-founder & CEO', initials: 'LL' },
  { name: 'Marco Esposito', role: 'Co-founder & CTO', initials: 'ME' },
  { name: 'Aiko Tanaka', role: 'Head of Infrastructure', initials: 'AT' },
  { name: 'Daniel Okafor', role: 'Head of Customer Care', initials: 'DO' },
]

export function About() {
  return (
    <>
      <PageHeader eyebrow="About Us" title="We make privacy easy for everyone">
        LaslesVPN started in 2020 with a simple idea: protecting yourself online should be as easy
        — and as fun — as using the internet itself.
      </PageHeader>

      <section className="container page-section">
        <ul className="stats about-stats">
          {[
            ['90+', 'Happy users'],
            [`${countries.length}`, 'Countries'],
            [`${servers.length}`, 'Servers'],
          ].map(([value, label]) => (
            <li key={label} className="stat">
              <div>
                <p className="stat-value">{value}</p>
                <p className="stat-label">{label}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="about-story">
          <h2 className="section-title">Our story</h2>
          <p>
            We were a small team of engineers tired of VPNs that were either confusing, slow or
            quietly selling user data. So we built the one we wanted to use ourselves: fast servers,
            a clear no-logs policy and an app anyone can set up in a minute.
          </p>
          <p>
            Today LaslesVPN protects people in dozens of countries — travellers, remote workers,
            students and small businesses who simply want the internet to be safe and open.
          </p>
        </div>

        <h2 className="subheading">What we believe</h2>
        <ul className="benefit-grid benefit-grid-3">
          {values.map((v) => (
            <li key={v.title} className="card benefit">
              <span className="platform-icon" aria-hidden="true">
                {v.icon}
              </span>
              <h3 className="card-title">{v.title}</h3>
              <p>{v.text}</p>
            </li>
          ))}
        </ul>

        <h2 className="subheading">Meet the team</h2>
        <ul className="team-grid">
          {team.map((m) => (
            <li key={m.name} className="card team-member">
              <span className="avatar" aria-hidden="true">
                {m.initials}
              </span>
              <b>{m.name}</b>
              <span>{m.role}</span>
            </li>
          ))}
        </ul>

        <div className="page-actions">
          <Link to="/partners" className="btn btn-primary">
            Partner With Us
          </Link>
          <Link to="/help#contact" className="btn btn-outline">
            Contact Us
          </Link>
        </div>
      </section>
    </>
  )
}
