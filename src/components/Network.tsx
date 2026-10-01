import { useT } from '../i18n/useT'
import map from '../assets/map.svg'
import sponsors from '../assets/sponsors.png'

export function Network() {
  const t = useT()
  return (
    <section className="network container">
      <div className="section-head">
        <h2 className="section-title">{t.network.title}</h2>
        <p>
          {t.network.textBefore}
          <b>LaslesVPN</b>{/* i18n-ignore */}
          {t.network.textAfter}
        </p>
      </div>
      <img className="network-map" src={map} alt={t.network.mapAlt} width={1060} height={538} />
      <img
        className="network-sponsors"
        src={sponsors}
        alt={t.network.sponsorsAlt}
        width={1136}
        height={208}
        loading="lazy"
      />
    </section>
  )
}
