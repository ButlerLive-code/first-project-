import { useState, type FormEvent } from 'react'
import { LocalLink } from '../i18n/LocalLink'
import { useT } from '../i18n/useT'
import logo from '../assets/logo.svg'
import facebook from '../assets/facebook.svg'
import twitter from '../assets/twitter.svg'
import instagram from '../assets/instagram.svg'

const socials = [
  { name: 'Facebook', icon: facebook, href: 'https://www.facebook.com/' },
  { name: 'Twitter', icon: twitter, href: 'https://x.com/' },
  { name: 'Instagram', icon: instagram, href: 'https://www.instagram.com/' },
]

export function Footer() {
  const [subscribed, setSubscribed] = useState<string | null>(null)
  const t = useT()
  const columns = [
    {
      title: t.footer.product,
      links: [
        { label: t.footer.download, to: '/download' },
        { label: t.footer.pricing, to: '/#pricing' },
        { label: t.footer.locations, to: '/locations' },
        { label: t.footer.server, to: '/servers' },
        { label: t.footer.countries, to: '/countries' },
        { label: t.footer.blog, to: '/blog' },
      ],
    },
    {
      title: t.footer.engage,
      links: [
        { label: 'LaslesVPN ?', to: '/what-is-vpn' }, // i18n-ignore
        { label: t.footer.faq, to: '/faq' },
        { label: t.footer.tutorials, to: '/tutorials' },
        { label: t.footer.aboutUs, to: '/about' },
        { label: t.footer.privacy, to: '/privacy' },
        { label: t.footer.terms, to: '/terms' },
      ],
    },
    {
      title: t.footer.earnMoney,
      links: [
        { label: t.footer.affiliate, to: '/affiliate' },
        { label: t.footer.becomePartner, to: '/partners' },
      ],
    },
  ]

  function handleSubscribe(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubscribed(String(new FormData(e.currentTarget).get('email')))
  }

  return (
    <footer className="footer">
      <div className="container">
        <div className="subscribe">
          <div>
            <h2 className="subscribe-title">{t.footer.subscribeTitle}</h2>
            <p>
              {subscribed ? (
                <>
                  {t.footer.subscribedBefore}
                  <b>{subscribed}</b>
                  {t.footer.subscribedAfter}
                </>
              ) : (
                t.footer.subscribePrompt
              )}
            </p>
          </div>
          {subscribed ? (
            <button type="button" className="btn btn-outline" onClick={() => setSubscribed(null)}>
              {t.footer.useAnotherEmail}
            </button>
          ) : (
            <form className="subscribe-form" onSubmit={handleSubscribe}>
              <input
                name="email"
                type="email"
                required
                placeholder={t.footer.emailPlaceholder}
                aria-label={t.footer.emailLabel}
                autoComplete="email"
              />
              <button type="submit" className="btn btn-primary">
                {t.footer.subscribeButton}
              </button>
            </form>
          )}
        </div>

        <div className="footer-main">
          <div className="footer-about">
            <LocalLink to="/">
              <img
                src={logo}
                alt="LaslesVPN" // i18n-ignore
                width={149}
                height={36}
              />
            </LocalLink>
            <p>
              <b>LaslesVPN</b>{/* i18n-ignore */} {t.footer.about}
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
              ©2020<span>LaslesVPN</span>{/* i18n-ignore */}
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
