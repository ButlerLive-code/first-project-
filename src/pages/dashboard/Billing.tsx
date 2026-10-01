import { useState, type ChangeEvent, type FormEvent } from 'react'
import { LocalLink } from '../../i18n/LocalLink'
import { billingLabel, formatDate, renewalDate } from '../../auth/account'
import type { Payment, User } from '../../auth/context'
import { useAuth } from '../../auth/useAuth'
import { getPlan } from '../../data/plans'
import { cardBrand, formatCardNumber, formatExpiry, isExpiryValid } from '../../utils/card'

function downloadInvoice(payment: Payment, user: User) {
  const plan = getPlan(payment.plan)
  const lines = [
    'LaslesVPN — Invoice',
    '',
    `Invoice:   ${payment.id}`,
    `Date:      ${formatDate(payment.date)}`,
    `Billed to: ${user.name} <${user.email}>`,
    '',
    `${plan?.name} (${billingLabel(payment.billing)})`,
    `Paid:      $${payment.amount.toFixed(2)}`,
    `Card:      ${user.card ? `${user.card.brand} •••• ${user.card.last4}` : '—'}`,
    '',
    'Demo invoice: no real payment was taken.',
  ]
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${payment.id}.txt`
  link.click()
  URL.revokeObjectURL(url)
}

export function Billing() {
  const { user, updateUser } = useAuth()
  const [editingCard, setEditingCard] = useState(false)
  const [card, setCard] = useState({ number: '', expiry: '' })
  const [cardError, setCardError] = useState('')
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [message, setMessage] = useState('')

  if (!user) return null

  const plan = getPlan(user.plan)
  const payments = user.payments ?? []
  const lastPayment = payments[0]
  const paid = plan && plan.price > 0

  function handleCard(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setCard((prev) => ({ ...prev, [name]: name === 'number' ? formatCardNumber(value) : formatExpiry(value) }))
    setCardError('')
  }

  function saveCard(e: FormEvent) {
    e.preventDefault()
    const digits = card.number.replace(/\s/g, '')
    if (digits.length !== 16) return setCardError('Enter a 16-digit card number.')
    if (!isExpiryValid(card.expiry)) return setCardError('Enter a valid expiry date (MM/YY).')
    updateUser({ card: { brand: cardBrand(digits), last4: digits.slice(-4), expiry: card.expiry } })
    setEditingCard(false)
    setCard({ number: '', expiry: '' })
    setMessage('Payment method updated.')
  }

  function cancelPlan() {
    updateUser({ plan: 'free', billing: undefined })
    setConfirmCancel(false)
    setMessage(`${plan?.name} cancelled. You're now on the Free Plan.`)
  }

  return (
    <div className="account-section">
      {message && (
        <div className="toast" role="status">
          <span>{message}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setMessage('')}>
            ×
          </button>
        </div>
      )}

      <div className="account-grid">
        <div className="card account-card">
          <h2 className="card-title">Subscription</h2>
          {plan ? (
            <>
              <div className="summary-plan">
                <img src={plan.image} alt="" width={56} height={64} />
                <div>
                  <p className="summary-plan-name">{plan.name}</p>
                  <p>
                    {paid
                      ? `$${plan.price} / month · billed ${billingLabel(user.billing ?? 'monthly').toLowerCase()}`
                      : 'Free forever'}
                  </p>
                </div>
              </div>
              {paid && lastPayment && (
                <p>
                  Renews on <b>{formatDate(renewalDate(lastPayment))}</b>
                </p>
              )}
              <div className="button-row">
                {plan.id !== 'premium' && (
                  <LocalLink to="/checkout?plan=premium" className="btn btn-primary">
                    Upgrade to Premium
                  </LocalLink>
                )}
                <LocalLink to={`/checkout?plan=${plan.id}`} className="btn btn-outline">
                  Change Plan
                </LocalLink>
              </div>
              {paid &&
                (confirmCancel ? (
                  <div className="confirm">
                    <p>Cancel {plan.name}? You'll move to the Free Plan right away.</p>
                    <div className="button-row">
                      <button type="button" className="btn btn-danger btn-sm" onClick={cancelPlan}>
                        Yes, cancel
                      </button>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => setConfirmCancel(false)}>
                        Keep plan
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="link-button" onClick={() => setConfirmCancel(true)}>
                    Cancel subscription
                  </button>
                ))}
            </>
          ) : (
            <>
              <p>You don't have a plan yet.</p>
              <LocalLink to="/checkout" className="btn btn-primary">
                Choose a Plan
              </LocalLink>
            </>
          )}
        </div>

        <div className="card account-card">
          <h2 className="card-title">Payment method</h2>
          {user.card && !editingCard && (
            <div className="saved-card">
              <span className="saved-card-brand">{user.card.brand}</span>
              <span>•••• {user.card.last4}</span>
              <span className="device-meta">Expires {user.card.expiry}</span>
            </div>
          )}
          {!user.card && !editingCard && <p>No card on file.</p>}
          {editingCard ? (
            <form className="form" onSubmit={saveCard}>
              <label className="field">
                <span>Card number</span>
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
                <span>Expiry</span>
                <input
                  name="expiry"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  placeholder="MM/YY"
                  value={card.expiry}
                  onChange={handleCard}
                />
              </label>
              {cardError && <p className="form-error">{cardError}</p>}
              <div className="button-row">
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Card
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditingCard(false)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setEditingCard(true)
                setMessage('')
              }}
            >
              {user.card ? 'Update Card' : 'Add Card'}
            </button>
          )}
        </div>
      </div>

      <div className="card account-card">
        <h2 className="card-title">Payment history</h2>
        {payments.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>
                    <span className="visually-hidden">Download</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{formatDate(payment.date)}</td>
                    <td>{payment.id}</td>
                    <td>
                      {getPlan(payment.plan)?.name} · {billingLabel(payment.billing)}
                    </td>
                    <td>
                      <b>${payment.amount.toFixed(2)}</b>
                    </td>
                    <td>
                      <span className="badge badge-green">Paid</span>
                    </td>
                    <td>
                      <button type="button" className="link-button" onClick={() => downloadInvoice(payment, user)}>
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No payments yet. Invoices for paid plans will appear here.</p>
        )}
      </div>
    </div>
  )
}
