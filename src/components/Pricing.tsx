import { useState } from 'react'
import { useLocalNavigate } from '../i18n/useLocalNavigate'
import { plans } from '../data/plans'
import { useT } from '../i18n/useT'
import { useLocale } from '../i18n/useLocale'
import { formatPrice } from '../i18n/format'

export function Pricing() {
  const [selected, setSelected] = useState(plans.length - 1)
  const navigate = useLocalNavigate()
  const t = useT()
  const locale = useLocale()

  return (
    <section className="pricing container" id="pricing">
      <div className="section-head">
        <h2 className="section-title">{t.pricing.title}</h2>
        <p>
          {t.pricing.text}
        </p>
      </div>

      <ul className="plans">
        {plans.map((plan, i) => (
          <li
            key={plan.id}
            className={`plan${i === selected ? ' is-active' : ''}`}
            onMouseEnter={() => setSelected(i)}
          >
            <img src={plan.image} alt="" width={145} height={165} />
            <h3 className="plan-name">{t.plans[plan.id].name}</h3>
            <ul className="plan-perks">
              {t.plans[plan.id].perks.map((perk) => (
                <li key={perk}>{perk}</li>
              ))}
            </ul>
            <p className="plan-price">
              {plan.price === 0 ? (
                t.pricing.free
              ) : (
                <>
                  {formatPrice(plan.price, locale)} <span>{t.pricing.perMonth}</span>
                </>
              )}
            </p>
            <button
              type="button"
              className="btn plan-select"
              onClick={() => navigate(`/checkout?plan=${plan.id}`)}
            >
              {t.pricing.select}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
