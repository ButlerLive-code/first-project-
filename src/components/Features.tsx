import { useT } from '../i18n/useT'
import illustration from '../assets/features.svg'
import check from '../assets/check.svg'

export function Features() {
  const t = useT()
  return (
    <section className="features container" id="features">
      <img className="features-image" src={illustration} alt="" width={508} height={415} />
      <div className="features-content">
        <h2 className="section-title">{t.features.title}</h2>
        <p className="features-text">
          {t.features.text}
        </p>
        <ul className="features-list">
          {t.features.items.map((feature) => (
            <li key={feature}>
              <img src={check} alt="" width={24} height={24} />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
