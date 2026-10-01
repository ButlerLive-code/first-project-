import { LocalLink } from '../i18n/LocalLink'
import { PageHeader } from '../components/PageHeader'

const benefits = [
  { icon: '🛡️', title: 'Safe on public Wi-Fi', text: 'Encryption keeps snoopers on café and airport networks from reading your traffic.' },
  { icon: '🕵️', title: 'Private browsing', text: 'Websites see a LaslesVPN IP address instead of your real one and location.' },
  { icon: '🌍', title: 'Internet without borders', text: 'Connect through 30+ countries to reach the content and services you need.' },
  { icon: '⚡', title: 'Supercharged speed', text: '50+ fast servers with live load info, so you always pick the quickest route.' },
]

const comparison = [
  ['Your IP address & location', 'Visible to every site', 'Hidden behind a LaslesVPN server'],
  ['Traffic on public Wi-Fi', 'Readable by others on the network', 'Encrypted with AES-256'],
  ['Your internet provider', 'Sees every site you visit', 'Sees only an encrypted tunnel'],
  ['Region-locked content', 'Limited to your country', 'Choose from 30+ countries'],
]

export function WhatIsVpn() {
  return (
    <>
      <PageHeader eyebrow="LaslesVPN ?" title="What is a VPN and why use LaslesVPN?">
        A VPN — virtual private network — creates an encrypted tunnel between your device and the
        internet. Here is how it works in plain English.
      </PageHeader>

      <section className="container page-section">
        <ol className="flow" aria-label="How LaslesVPN works">
          <li className="flow-node">
            <span aria-hidden="true">💻</span>
            <b>Your device</b>
            <small>Traffic is encrypted before it leaves</small>
          </li>
          <li className="flow-link" aria-hidden="true">
            <span>🔒 encrypted tunnel</span>
          </li>
          <li className="flow-node flow-node-accent">
            <span aria-hidden="true">🛡️</span>
            <b>LaslesVPN server</b>
            <small>Swaps your IP for its own</small>
          </li>
          <li className="flow-link" aria-hidden="true">
            <span>🌐 private IP</span>
          </li>
          <li className="flow-node">
            <span aria-hidden="true">🌍</span>
            <b>The internet</b>
            <small>Sites see the server, not you</small>
          </li>
        </ol>

        <h2 className="subheading">Without a VPN vs. with LaslesVPN</h2>
        <div className="table-wrap">
          <table className="table compare">
            <thead>
              <tr>
                <th />
                <th>Without a VPN</th>
                <th>With LaslesVPN</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map(([label, without, withVpn]) => (
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

        <h2 className="subheading">Why people choose LaslesVPN</h2>
        <ul className="benefit-grid">
          {benefits.map((b) => (
            <li key={b.title} className="card benefit">
              <span className="platform-icon" aria-hidden="true">
                {b.icon}
              </span>
              <h3 className="card-title">{b.title}</h3>
              <p>{b.text}</p>
            </li>
          ))}
        </ul>

        <div className="page-actions">
          <LocalLink to="/#pricing" className="btn btn-primary">
            Choose Your Plan
          </LocalLink>
          <LocalLink to="/faq" className="btn btn-outline">
            Read the FAQ
          </LocalLink>
        </div>
      </section>
    </>
  )
}
