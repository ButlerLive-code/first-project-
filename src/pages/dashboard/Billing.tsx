import { useState, type ChangeEvent, type FormEvent } from 'react'
import { LocalLink } from '../../i18n/LocalLink'
import { formatDate, renewalDate } from '../../auth/account'
import type { Payment, User } from '../../auth/context'
import { useAuth } from '../../auth/useAuth'
import { formatAmount, formatPrice } from '../../i18n/format'
import { useLocale } from '../../i18n/useLocale'
import { usePageMeta } from '../../i18n/usePageMeta'
import { message, useT, type Message } from '../../i18n/useT'
import { getPlan } from '../../data/plans'
import type { Dictionary } from '../../i18n/en'
import type { Locale } from '../../i18n/locales'
import { cardBrand, formatCardNumber, formatExpiry, isExpiryValid } from '../../utils/card'

// cardBrand() stores 'Card' for unknown brands; show it in the page language.
function brandLabel(brand: string, t: Dictionary) {
  return brand === 'Card' ? t.billing.genericCard : brand
}

// Stored data may be older or odd: fall back to the raw plan id, and to monthly.
function planName(id: string, t: Dictionary) {
  return (t.plans as Record<string, { name: string } | undefined>)[id]?.name ?? id
}

function billingName(billing: string | undefined, t: Dictionary) {
  return billing === 'yearly' ? t.billing.yearly : t.billing.monthly
}

function downloadInvoice(payment: Payment, user: User, t: Dictionary, locale: Locale) {
  const text = t.billing.invoiceText({
    id: payment.id,
    date: formatDate(payment.date, locale),
    billedTo: `${user.name} <${user.email}>`,
    plan: planName(payment.plan, t),
    period: billingName(payment.billing, t),
    amount: formatAmount(payment.amount, locale),
    card: user.card ? `${brandLabel(user.card.brand, t)} •••• ${user.card.last4}` : '—',
  })
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${payment.id}.txt`
  link.click()
  URL.revokeObjectURL(url)
}

export function Billing() {
  const t = useT()
  const locale = useLocale()
  usePageMeta(t.billing.metaTitle)
  const { user, updateUser } = useAuth()
  const [editingCard, setEditingCard] = useState(false)
  const [card, setCard] = useState({ number: '', expiry: '' })
  const [cardError, setCardError] = useState<Message>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [notice, setNotice] = useState<Message>(null)

  if (!user) return null

  const plan = getPlan(user.plan)
  const payments = user.payments ?? []
  const lastPayment = payments[0]
  const paid = plan && plan.price > 0

  function handleCard(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setCard((prev) => ({ ...prev, [name]: name === 'number' ? formatCardNumber(value) : formatExpiry(value) }))
    setCardError(null)
  }

  function saveCard(e: FormEvent) {
    e.preventDefault()
    const digits = card.number.replace(/\s/g, '')
    if (digits.length !== 16) return setCardError(message((t) => t.checkout.errors.cardNumber))
    if (!isExpiryValid(card.expiry)) return setCardError(message((t) => t.checkout.errors.expiry))
    updateUser({ card: { brand: cardBrand(digits), last4: digits.slice(-4), expiry: card.expiry } })
    setEditingCard(false)
    setCard({ number: '', expiry: '' })
    setNotice(message((t) => t.billing.cardUpdated))
  }

  function cancelPlan() {
    if (!plan) return
    const planId = plan.id
    updateUser({ plan: 'free', billing: undefined })
    setConfirmCancel(false)
    setNotice(message((t) => t.billing.cancelled(t.plans[planId].name)))
  }

  return (
    <div className="account-section">
      {notice && (
        <div className="toast" role="status">
          <span>{notice(t)}</span>
          <button type="button" aria-label={t.common.dismiss} onClick={() => setNotice(null)}>
            ×
          </button>
        </div>
      )}

      <div className="account-grid">
        <div className="card account-card">
          <h2 className="card-title">{t.billing.subscription}</h2>
          {plan ? (
            <>
              <div className="summary-plan">
                <img src={plan.image} alt="" width={56} height={64} />
                <div>
                  <p className="summary-plan-name">{t.plans[plan.id].name}</p>
                  <p>
                    {paid
                      ? t.billing[user.billing === 'yearly' ? 'billedYearlyLine' : 'billedMonthlyLine'](
                          formatPrice(plan.price, locale),
                        )
                      : t.checkout.freeForever}
                  </p>
                </div>
              </div>
              {paid && lastPayment && (
                <p>
                  {t.billing.renewsOnBefore}
                  <b>{formatDate(renewalDate(lastPayment), locale)}</b>
                </p>
              )}
              <div className="button-row">
                {plan.id !== 'premium' && (
                  <LocalLink to="/checkout?plan=premium" className="btn btn-primary">
                    {t.billing.upgradePremium}
                  </LocalLink>
                )}
                <LocalLink to={`/checkout?plan=${plan.id}`} className="btn btn-outline">
                  {t.billing.changePlan}
                </LocalLink>
              </div>
              {paid &&
                (confirmCancel ? (
                  <div className="confirm">
                    <p>{t.billing.cancelConfirm(t.plans[plan.id].name)}</p>
                    <div className="button-row">
                      <button type="button" className="btn btn-danger btn-sm" onClick={cancelPlan}>
                        {t.billing.yesCancel}
                      </button>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => setConfirmCancel(false)}>
                        {t.billing.keepPlan}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="link-button" onClick={() => setConfirmCancel(true)}>
                    {t.billing.cancelSubscription}
                  </button>
                ))}
            </>
          ) : (
            <>
              <p>{t.billing.noPlanYet}</p>
              <LocalLink to="/checkout" className="btn btn-primary">
                {t.common.choosePlan}
              </LocalLink>
            </>
          )}
        </div>

        <div className="card account-card">
          <h2 className="card-title">{t.billing.paymentMethod}</h2>
          {user.card && !editingCard && (
            <div className="saved-card">
              <span className="saved-card-brand">{brandLabel(user.card.brand, t)}</span>
              <span>•••• {user.card.last4}</span>
              <span className="device-meta">{t.billing.expires(user.card.expiry)}</span>
            </div>
          )}
          {!user.card && !editingCard && <p>{t.billing.noCard}</p>}
          {editingCard ? (
            <form className="form" onSubmit={saveCard}>
              <label className="field">
                <span>{t.checkout.cardNumber}</span>
                <input
                  name="number"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="4242 4242 4242 4242"
                  value={card.number}
                  onChange={handleCard}
                />
              </label>
              <label className="field">
                <span>{t.checkout.expiry}</span>
                <input
                  name="expiry"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  placeholder={t.checkout.expiryPlaceholder}
                  value={card.expiry}
                  onChange={handleCard}
                />
              </label>
              {cardError && <p className="form-error">{cardError(t)}</p>}
              <div className="button-row">
                <button type="submit" className="btn btn-primary btn-sm">
                  {t.billing.saveCard}
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditingCard(false)}>
                  {t.billing.cancel}
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setEditingCard(true)
                setNotice(null)
              }}
            >
              {user.card ? t.billing.updateCard : t.billing.addCard}
            </button>
          )}
        </div>
      </div>

      <div className="card account-card">
        <h2 className="card-title">{t.billing.history}</h2>
        {payments.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t.billing.date}</th>
                  <th>{t.billing.invoice}</th>
                  <th>{t.billing.plan}</th>
                  <th>{t.billing.amount}</th>
                  <th>{t.billing.status}</th>
                  <th>
                    <span className="visually-hidden">{t.billing.download}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{formatDate(payment.date, locale)}</td>
                    <td>{payment.id}</td>
                    <td>
                      {planName(payment.plan, t)} · {billingName(payment.billing, t)}
                    </td>
                    <td>
                      <b>{formatAmount(payment.amount, locale)}</b>
                    </td>
                    <td>
                      <span className="badge badge-green">{t.billing.paid}</span>
                    </td>
                    <td>
                      <button type="button" className="link-button" onClick={() => downloadInvoice(payment, user, t, locale)}>
                        {t.billing.download}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>{t.billing.noPayments}</p>
        )}
      </div>
    </div>
  )
}
