import { useState, type FormEvent } from 'react'
import { PageHeader } from '../components/PageHeader'
import { SuccessCard } from '../components/SuccessCard'
import { plans } from '../data/plans'
import { formatPrice } from '../i18n/format'
import { useLocale } from '../i18n/useLocale'
import { usePageMeta } from '../i18n/usePageMeta'
import { useT } from '../i18n/useT'

const COMMISSION = 0.3

const paidPlans = plans.filter((p) => p.price > 0)

export function Affiliate() {
  const t = useT()
  const a = t.affiliate
  const locale = useLocale()
  usePageMeta(a.metaTitle)
  const [referrals, setReferrals] = useState(25)
  const [planId, setPlanId] = useState(paidPlans[0].id)
  const [applied, setApplied] = useState(false)
  const price = paidPlans.find((p) => p.id === planId)?.price ?? 0
  const monthly = referrals * price * COMMISSION

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setApplied(true)
  }

  return (
    <>
      <PageHeader eyebrow={a.eyebrow} title={a.title}>
        {a.text}
      </PageHeader>

      <section className="container page-section">
        <ol className="steps steps-row">
          {a.steps.map((s, i) => (
            <li key={s.title} className="step">
              <span className="step-number">{i + 1}</span>
              <div>
                <h2 className="card-title">{s.title}</h2>
                <p>{s.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="calculator card">
          <div>
            <h2 className="section-title">{a.calcTitle}</h2>
            <label className="field">
              <span>{a.referrals(referrals)}</span>
              <input
                type="range"
                min={1}
                max={200}
                value={referrals}
                onChange={(e) => setReferrals(Number(e.target.value))}
              />
            </label>
            <div className="segmented">
              {paidPlans.map((p) => (
                <label key={p.id} className={planId === p.id ? 'is-active' : ''}>
                  <input
                    type="radio"
                    name="calc-plan"
                    checked={planId === p.id}
                    onChange={() => setPlanId(p.id)}
                  />
                  {t.plans[p.id].name}
                </label>
              ))}
            </div>
          </div>
          <div className="calculator-result">
            <p>{a.estimated}</p>
            <p className="calculator-value">{formatPrice(Math.round(monthly), locale)}</p>
            <p>{a.perMonthYear(formatPrice(Math.round(monthly * 12), locale))}</p>
          </div>
        </div>

        <div className="contact" id="apply">
          <div>
            <h2 className="section-title">{a.joinTitle}</h2>
            <p>{a.joinText}</p>
          </div>
          {applied ? (
            <SuccessCard title={a.receivedTitle} onReset={() => setApplied(false)} resetLabel={a.submitAnother}>
              <p>{a.receivedText}</p>
            </SuccessCard>
          ) : (
            <form className="card form" onSubmit={handleSubmit}>
              <div className="field-row">
                <label className="field">
                  <span>{a.name}</span>
                  <input name="name" required autoComplete="name" />
                </label>
                <label className="field">
                  <span>{a.email}</span>
                  <input name="email" type="email" required autoComplete="email" />
                </label>
              </div>
              <label className="field">
                <span>{a.site}</span>
                <input name="site" type="url" required placeholder="https://" />{/* i18n-ignore */}
              </label>
              <label className="field">
                <span>{a.audience}</span>
                <select name="audience" defaultValue="1k-10k">
                  {['<1k', '1k-10k', '10k-100k', '100k+'].map((value, i) => (
                    <option key={value} value={value}>
                      {a.audiences[i]}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="btn btn-primary form-submit">
                {a.apply}
              </button>
            </form>
          )}
        </div>
      </section>
    </>
  )
}
