import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { getPlan, plans, type PlanId } from '../data/plans'

type Billing = 'monthly' | 'yearly'

// Yearly billing: pay for 10 months, get 12.
const YEARLY_MONTHS = 10

function formatCardNumber(value: string) {
  return value
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(.{4})(?=.)/g, '$1 ')
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
}

function isExpiryValid(value: string) {
  const match = /^(\d{2})\/(\d{2})$/.exec(value)
  if (!match) return false
  const month = Number(match[1])
  const year = 2000 + Number(match[2])
  if (month < 1 || month > 12) return false
  const now = new Date()
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1)
}

export function Checkout() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const plan = getPlan(params.get('plan')) ?? getPlan(user?.plan) ?? plans[1]
  const [billing, setBilling] = useState<Billing>('monthly')
  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvc: '' })
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)

  const isFree = plan.price === 0
  const total = billing === 'yearly' ? plan.price * YEARLY_MONTHS : plan.price
  const isCurrent = user?.plan === plan.id

  function selectPlan(id: PlanId) {
    setParams({ plan: id }, { replace: true })
    setError('')
  }

  function handleCard(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    const formatted =
      name === 'number'
        ? formatCardNumber(value)
        : name === 'expiry'
          ? formatExpiry(value)
          : name === 'cvc'
            ? value.replace(/\D/g, '').slice(0, 4)
            : value
    setCard((prev) => ({ ...prev, [name]: formatted }))
    setError('')
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isFree) {
      if (card.number.replace(/\s/g, '').length !== 16) return setError('Enter a 16-digit card number.')
      if (!isExpiryValid(card.expiry)) return setError('Enter a valid expiry date (MM/YY).')
      if (card.cvc.length < 3) return setError('Enter the 3–4 digit CVC.')
    }
    setProcessing(true)
    // Simulated payment round-trip. Card details never leave this component.
    setTimeout(() => {
      updateUser({ plan: plan.id })
      navigate('/dashboard?welcome=1', { replace: true })
    }, 1200)
  }

  return (
    <section className="checkout container">
      <h1 className="section-title">Complete your order</h1>
      <p className="checkout-subtitle">
        Signed in as <b>{user?.email}</b>. You can change or cancel your plan at any time.
      </p>

      <form className="checkout-grid" onSubmit={handleSubmit}>
        <div className="checkout-main">
          <fieldset className="checkout-step">
            <legend>1. Choose a plan</legend>
            <div className="plan-options">
              {plans.map((p) => (
                <label key={p.id} className={`plan-option${p.id === plan.id ? ' is-active' : ''}`}>
                  <input
                    type="radio"
                    name="plan"
                    value={p.id}
                    checked={p.id === plan.id}
                    onChange={() => selectPlan(p.id)}
                  />
                  <img src={p.image} alt="" width={56} height={64} />
                  <span className="plan-option-name">{p.name}</span>
                  <span className="plan-option-price">
                    {p.price === 0 ? 'Free' : `$${p.price} / mo`}
                  </span>
                  {user?.plan === p.id && <span className="badge">Current</span>}
                </label>
              ))}
            </div>
          </fieldset>

          {!isFree && (
            <fieldset className="checkout-step">
              <legend>2. Billing period</legend>
              <div className="segmented">
                {(['monthly', 'yearly'] as const).map((b) => (
                  <label key={b} className={billing === b ? 'is-active' : ''}>
                    <input
                      type="radio"
                      name="billing"
                      value={b}
                      checked={billing === b}
                      onChange={() => setBilling(b)}
                    />
                    {b === 'monthly' ? 'Monthly' : 'Yearly · 2 months free'}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {!isFree && (
            <fieldset className="checkout-step">
              <legend>3. Payment details</legend>
              <p className="demo-note">
                Demo checkout — no payment is processed and card details are not saved.
              </p>
              <div className="form">
                <label className="field">
                  <span>Name on card</span>
                  <input name="name" required autoComplete="cc-name" value={card.name} onChange={handleCard} />
                </label>
                <label className="field">
                  <span>Card number</span>
                  <input
                    name="number"
                    required
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="4242 4242 4242 4242"
                    value={card.number}
                    onChange={handleCard}
                  />
                </label>
                <div className="field-row">
                  <label className="field">
                    <span>Expiry</span>
                    <input
                      name="expiry"
                      required
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      placeholder="MM/YY"
                      value={card.expiry}
                      onChange={handleCard}
                    />
                  </label>
                  <label className="field">
                    <span>CVC</span>
                    <input
                      name="cvc"
                      required
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      placeholder="123"
                      value={card.cvc}
                      onChange={handleCard}
                    />
                  </label>
                </div>
              </div>
            </fieldset>
          )}
        </div>

        <aside className="summary">
          <h2 className="summary-title">Order summary</h2>
          <div className="summary-plan">
            <img src={plan.image} alt="" width={72} height={82} />
            <div>
              <p className="summary-plan-name">{plan.name}</p>
              <p>{isFree ? 'Free forever' : billing === 'monthly' ? 'Billed monthly' : 'Billed yearly'}</p>
            </div>
          </div>
          <ul className="plan-perks summary-perks">
            {plan.perks.map((perk) => (
              <li key={perk}>{perk}</li>
            ))}
          </ul>
          {billing === 'yearly' && !isFree && (
            <p className="summary-line">
              <span>Discount</span>
              <span className="summary-discount">−${plan.price * 2}</span>
            </p>
          )}
          <p className="summary-line summary-total">
            <span>Total today</span>
            <span>${total}</span>
          </p>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn btn-primary form-submit" disabled={processing || isCurrent}>
            {processing
              ? 'Processing…'
              : isCurrent
                ? 'This is your current plan'
                : isFree
                  ? 'Activate Free Plan'
                  : `Pay $${total}`}
          </button>
        </aside>
      </form>
    </section>
  )
}
