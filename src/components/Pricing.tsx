import { useState } from 'react'
import { useLocalNavigate } from '../i18n/useLocalNavigate'
import { plans } from '../data/plans'

export function Pricing() {
  const [selected, setSelected] = useState(plans.length - 1)
  const navigate = useLocalNavigate()

  return (
    <section className="pricing container" id="pricing">
      <div className="section-head">
        <h2 className="section-title">Choose Your Plan</h2>
        <p>
          Let's choose the package that is best for you and explore it happily and cheerfully.
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
            <h3 className="plan-name">{plan.name}</h3>
            <ul className="plan-perks">
              {plan.perks.map((perk) => (
                <li key={perk}>{perk}</li>
              ))}
            </ul>
            <p className="plan-price">
              {plan.price === 0 ? (
                'Free'
              ) : (
                <>
                  ${plan.price} <span>/ mo</span>
                </>
              )}
            </p>
            <button
              type="button"
              className="btn plan-select"
              onClick={() => navigate(`/checkout?plan=${plan.id}`)}
            >
              Select
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
