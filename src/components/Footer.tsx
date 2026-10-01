import { useState, type FormEvent } from 'react'
import { LocalLink } from '../i18n/LocalLink'
import logo from '../assets/logo.svg'
import facebook from '../assets/facebook.svg'
import twitter from '../assets/twitter.svg'
import instagram from '../assets/instagram.svg'

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Download', to: '/download' },
      { label: 'Pricing', to: '/#pricing' },
      { label: 'Locations', to: '/locations' },
      { label: 'Server', to: '/servers' },
      { label: 'Countries', to: '/countries' },
      { label: 'Blog', to: '/blog' },
    ],
  },
  {
    title: 'Engage',
    links: [
      { label: 'LaslesVPN ?', to: '/what-is-vpn' },
      { label: 'FAQ', to: '/faq' },
      { label: 'Tutorials', to: '/tutorials' },
      { label: 'About Us', to: '/about' },
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms of Service', to: '/terms' },
    ],
  },
  {
    title: 'Earn Money',
    links: [
      { label: 'Affiliate', to: '/affiliate' },
      { label: 'Become Partner', to: '/partners' },
    ],
  },
]

const socials = [
  { name: 'Facebook', icon: facebook, href: 'https://www.facebook.com/' },
  { name: 'Twitter', icon: twitter, href: 'https://x.com/' },
  { name: 'Instagram', icon: instagram, href: 'https://www.instagram.com/' },
]

export function Footer() {
  const [subscribed, setSubscribed] = useState<string | null>(null)

  function handleSubscribe(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubscribed(String(new FormData(e.currentTarget).get('email')))
  }

  return (
    <footer className="footer">
      <div className="container">
        <div className="subscribe">
          <div>
            <h2 className="subscribe-title">Subscribe Now for Get Special Features!</h2>
            <p>
              {subscribed ? (
                <>
                  Thanks! Special offers will go to <b>{subscribed}</b> (demo — nothing was sent).
                </>
              ) : (
                "Let's subscribe with us and find the fun."
              )}
            </p>
          </div>
          {subscribed ? (
            <button type="button" className="btn btn-outline" onClick={() => setSubscribed(null)}>
              Use another email
            </button>
          ) : (
            <form className="subscribe-form" onSubmit={handleSubscribe}>
              <input
                name="email"
                type="email"
                required
                placeholder="Your email"
                aria-label="Email address"
                autoComplete="email"
              />
              <button type="submit" className="btn btn-primary">
                Subscribe Now
              </button>
            </form>
          )}
        </div>

        <div className="footer-main">
          <div className="footer-about">
            <LocalLink to="/">
              <img src={logo} alt="LaslesVPN" width={149} height={36} />
            </LocalLink>
            <p>
              <b>LaslesVPN</b> is a private virtual network that has unique features and has high
              security.
            </p>
            <ul className="footer-socials">
              {socials.map((s) => (
                <li key={s.name}>
                  <a href={s.href} aria-label={s.name} target="_blank" rel="noreferrer">
                    <img src={s.icon} alt="" width={70} height={70} />
                  </a>
                </li>
              ))}
            </ul>
            <p className="footer-copy">
              ©2020<span>LaslesVPN</span>
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title} className="footer-col">
              <h3>{col.title}</h3>
              <ul>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <LocalLink to={link.to}>{link.label}</LocalLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  )
}
