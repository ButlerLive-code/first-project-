import { useState } from 'react'
import type { Payment, Profile, Subscription } from '../../../shared/api'
import { ApiState } from '../../api/ApiState'
import { apiFetch } from '../../api/client'
import { errorMessage } from '../../api/errorMessage'
import { useMe, usePayments } from '../../api/useApi'
import { LocalLink } from '../../i18n/LocalLink'
import { formatDate } from '../../auth/account'
import { formatAmount, formatPrice } from '../../i18n/format'
import { useLocale } from '../../i18n/useLocale'
import { usePageMeta } from '../../i18n/usePageMeta'
import { message, useT, type Message } from '../../i18n/useT'
import { getPlan } from '../../data/plans'
import type { Dictionary } from '../../i18n/en'
import type { Locale } from '../../i18n/locales'

// cardBrand() stores 'Card' for unknown brands; show it in the page language.
function brandLabel(brand: string, t: Dictionary) {
  return brand === 'Card' ? t.billing.genericCard : brand
}

// Stored data may be older or odd: fall back to the raw plan id, and to monthly.
function planName(id: string, t: Dictionary) {
  return (t.plans as Record<string, { name: string } | undefined>)[id]?.name ?? id
}

function billingName(billing: string | null | undefined, t: Dictionary) {
  return billing === 'yearly' ? t.billing.yearly : t.billing.monthly
}

function downloadInvoice(payment: Payment, user: Profile, t: Dictionary, locale: Locale) {
  const text = t.billing.invoiceText({
    id: payment.id,
    date: formatDate(payment.createdAt, locale),
    billedTo: `${user.name} <${user.email}>`,
    plan: planName(payment.plan, t),
    period: billingName(payment.billing, t),
    amount: formatAmount(payment.amount / 100, locale),
    card: `${brandLabel(payment.cardBrand, t)} •••• ${payment.cardLast4}`,
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
  const me = useMe()
  const paymentsState = usePayments()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [notice, setNotice] = useState<Message>(null)
  const [error, setError] = useState<Message>(null)

  if (!me.data || !paymentsState.data) {
    return (
      <ApiState
        error={me.error ?? paymentsState.error}
        onRetry={() => {
          me.reload()
          paymentsState.reload()
        }}
      />
    )
  }

  const meData = me.data
  const subscription = meData.subscription
  const plan = getPlan(subscription?.plan)
  const payments = paymentsState.data
  const lastPayment = payments[0]
  const paid = plan !== undefined && plan.price > 0
  const endsAt = subscription?.renewsAt ? formatDate(subscription.renewsAt, locale) : ''

  async function cancelPlan() {
    if (!plan) return
    const planId = plan.id
    setError(null)
    try {
      const next = await apiFetch<Subscription>('/api/me/subscription/cancel', { method: 'POST' })
      me.setData({ ...meData, subscription: next })
      setConfirmCancel(false)
      const date = next.renewsAt ? formatDate(next.renewsAt, locale) : ''
      setNotice(message((t) => t.billing.cancelled(t.plans[planId].name, date)))
    } catch (err) {
      setError(message((t) => errorMessage(t, err)))
    }
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
                      ? t.billing[subscription?.billing === 'yearly' ? 'billedYearlyLine' : 'billedMonthlyLine'](
                          formatPrice(plan.price, locale),
                        )
                      : t.checkout.freeForever}
                  </p>
                </div>
              </div>
              {paid && endsAt && (
                <p>
                  {subscription?.status === 'canceled' ? t.billing.endsOnBefore : t.billing.renewsOnBefore}
                  <b>{endsAt}</b>
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
              {error && <p className="form-error">{error(t)}</p>}
              {paid &&
                subscription?.status === 'active' &&
                (confirmCancel ? (
                  <div className="confirm">
                    <p>{t.billing.cancelConfirm(t.plans[plan.id].name, endsAt)}</p>
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
          {lastPayment ? (
            <div className="saved-card">
              <span className="saved-card-brand">{brandLabel(lastPayment.cardBrand, t)}</span>
              <span>•••• {lastPayment.cardLast4}</span>
            </div>
          ) : (
            <p>{t.billing.noCard}</p>
          )}
          <p className="device-meta">{t.billing.cardNote}</p>
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
                    <td>{formatDate(payment.createdAt, locale)}</td>
                    <td>{payment.id}</td>
                    <td>
                      {planName(payment.plan, t)} · {billingName(payment.billing, t)}
                    </td>
                    <td>
                      <b>{formatAmount(payment.amount / 100, locale)}</b>
                    </td>
                    <td>
                      <span className="badge badge-green">{t.billing.paid}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => downloadInvoice(payment, meData.user, t, locale)}
                      >
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
