import map from '../assets/map.svg'
import sponsors from '../assets/sponsors.png'

export function Network() {
  return (
    <section className="network container">
      <div className="section-head">
        <h2 className="section-title">Huge Global Network of Fast VPN</h2>
        <p>
          See <b>LaslesVPN</b> everywhere to make it easier for you when you move locations.
        </p>
      </div>
      <img className="network-map" src={map} alt="Map of LaslesVPN servers" width={1060} height={538} />
      <img
        className="network-sponsors"
        src={sponsors}
        alt="Netflix, Reddit, Amazon, Discord, Spotify"
        width={1136}
        height={208}
        loading="lazy"
      />
    </section>
  )
}
