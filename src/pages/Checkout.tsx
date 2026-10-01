import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { useLocalNavigate } from '../i18n/useLocalNavigate'
import { newId } from '../auth/account'
import type { Billing } from '../auth/context'
import { useAuth } from '../auth/useAuth'
import { message, useT, type Message } from '../i18n/useT'
import { useLocale } from '../i18n/useLocale'
import { usePageMeta } from '../i18n/usePageMeta'
import { formatPrice } from '../i18n/format'
import { getPlan, plans, type PlanId } from '../data/plans'
import { cardBrand, formatCardNumber, formatExpiry, isExpiryValid } from '../../shared/card'

// Yearly billing: pay for 10 months, get 12.
const YEARLY_MONTHS = 10

export function Checkout() {
  const { user, updateUser } = useAuth()
  const t = useT()
  const locale = useLocale()
  usePageMeta(t.checkout.metaTitle)
  const navigate = useLocalNavigate()
  const [params, setParams] = useSearchParams()
  const plan = getPlan(params.get('plan')) ?? getPlan(user?.plan) ?? plans[1]
  const [billing, setBilling] = useState<Billing>(user?.billing ?? 'monthly')
  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvc: '' })
  const [error, setError] = useState<Message>(null)
  const [processing, setProcessing] = useState(false)

  const isFree = plan.price === 0
  const total = billing === 'yearly' ? plan.price * YEARLY_MONTHS : plan.price
  // Switching the billing period of the current plan is a valid order.
  const isCurrent = user?.plan === plan.id && (isFree || (user.billing ?? 'monthly') === billing)

  function selectPlan(id: PlanId) {
    setParams({ plan: id }, { replace: true })
    setError(null)
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
    setError(null)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isFree) {
      if (card.number.replace(/\s/g, '').length !== 16) return setError(message((t) => t.checkout.errors.cardNumber))
      if (!isExpiryValid(card.expiry)) return setError(message((t) => t.checkout.errors.expiry))
      if (card.cvc.length < 3) return setError(message((t) => t.checkout.errors.cvc))
    }
    setProcessing(true)
    // Simulated payment round-trip. Card details never leave this component.
    setTimeout(() => {
      if (isFree) {
        updateUser({ plan: plan.id, billing: undefined })
      } else {
        // Only the brand and last four digits are kept, for the Billing tab.
        const payment = { id: newId('INV'), date: new Date().toISOString(), plan: plan.id, billing, amount: total }
        updateUser({
          plan: plan.id,
          billing,
          payments: [payment, ...(user?.payments ?? [])],
          card: { brand: cardBrand(card.number), last4: card.number.replace(/\s/g, '').slice(-4), expiry: card.expiry },
        })
      }
      navigate('/dashboard?welcome=1', { replace: true })
    }, 1200)
  }

  return (
    <section className="checkout container">
      <h1 className="section-title">{t.checkout.title}</h1>
      <p className="checkout-subtitle">
        {t.checkout.signedInBefore}
        <b>{user?.email}</b>
        {t.checkout.signedInAfter}
      </p>

      <form className="checkout-grid" onSubmit={handleSubmit}>
        <div className="checkout-main">
          <fieldset className="checkout-step">
            <legend>{t.checkout.stepPlan}</legend>
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
                  <span className="plan-option-name">{t.plans[p.id].name}</span>
                  <span className="plan-option-price">
                    {p.price === 0 ? t.pricing.free : `${formatPrice(p.price, locale)} ${t.pricing.perMonth}`}
                  </span>
                  {user?.plan === p.id && <span className="badge">{t.checkout.current}</span>}
                </label>
              ))}
            </div>
          </fieldset>

          {!isFree && (
            <fieldset className="checkout-step">
              <legend>{t.checkout.stepBilling}</legend>
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
                    {b === 'monthly' ? t.checkout.monthly : t.checkout.yearly}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {!isFree && (
            <fieldset className="checkout-step">
              <legend>{t.checkout.stepPayment}</legend>
              <p className="demo-note">
                {t.checkout.demoNote}
              </p>
              <div className="form">
                <label className="field">
                  <span>{t.checkout.nameOnCard}</span>
                  <input name="name" required autoComplete="cc-name" value={card.name} onChange={handleCard} />
                </label>
                <label className="field">
                  <span>{t.checkout.cardNumber}</span>
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
                    <span>{t.checkout.expiry}</span>
                    <input
                      name="expiry"
                      required
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      placeholder={t.checkout.expiryPlaceholder}
                      value={card.expiry}
                      onChange={handleCard}
                    />
                  </label>
                  <label className="field">
                    <span>{t.checkout.cvc}</span>
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
          <h2 className="summary-title">{t.checkout.summary}</h2>
          <div className="summary-plan">
            <img src={plan.image} alt="" width={72} height={82} />
            <div>
              <p className="summary-plan-name">{t.plans[plan.id].name}</p>
              <p>{isFree ? t.checkout.freeForever : billing === 'monthly' ? t.checkout.billedMonthly : t.checkout.billedYearly}</p>
            </div>
          </div>
          <ul className="plan-perks summary-perks">
            {t.plans[plan.id].perks.map((perk) => (
              <li key={perk}>{perk}</li>
            ))}
          </ul>
          {billing === 'yearly' && !isFree && (
            <p className="summary-line">
              <span>{t.checkout.discount}</span>
              <span className="summary-discount">−{formatPrice(plan.price * 2, locale)}</span>
            </p>
          )}
          <p className="summary-line summary-total">
            <span>{t.checkout.totalToday}</span>
            <span>{formatPrice(total, locale)}</span>
          </p>
          {error && <p className="form-error">{error(t)}</p>}
          <button type="submit" className="btn btn-primary form-submit" disabled={processing || isCurrent}>
            {processing
              ? t.checkout.processing
              : isCurrent
                ? t.checkout.currentPlan
                : isFree
                  ? t.checkout.activateFree
                  : t.checkout.pay(formatPrice(total, locale))}
          </button>
        </aside>
      </form>
    </section>
  )
}
