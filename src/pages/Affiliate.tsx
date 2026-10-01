import { useState, type FormEvent } from 'react'
import { PageHeader } from '../components/PageHeader'
import { SuccessCard } from '../components/SuccessCard'
import { plans } from '../data/plans'

const COMMISSION = 0.3

const steps = [
  { title: 'Apply', text: 'Tell us about your website, channel or community. Approval takes 1–2 days.' },
  { title: 'Share your link', text: 'Get a personal link and ready-made banners for your audience.' },
  { title: 'Earn 30%', text: 'Receive 30% of every payment your referrals make for their first year.' },
]

const paidPlans = plans.filter((p) => p.price > 0)

export function Affiliate() {
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
      <PageHeader eyebrow="Affiliate Program" title="Earn money recommending LaslesVPN">
        Share a product your audience will love and earn a 30% commission on every sale.
      </PageHeader>

      <section className="container page-section">
        <ol className="steps steps-row">
          {steps.map((s, i) => (
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
            <h2 className="section-title">Estimate your earnings</h2>
            <label className="field">
              <span>New paying referrals per month: {referrals}</span>
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
                  {p.name}
                </label>
              ))}
            </div>
          </div>
          <div className="calculator-result">
            <p>Estimated commission</p>
            <p className="calculator-value">${monthly.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
            <p>per month · ${(monthly * 12).toLocaleString('en-US', { maximumFractionDigits: 0 })} per year</p>
          </div>
        </div>

        <div className="contact" id="apply">
          <div>
            <h2 className="section-title">Join the program</h2>
            <p>Bloggers, YouTubers, review sites and communities of any size are welcome.</p>
          </div>
          {applied ? (
            <SuccessCard title="Application received!" onReset={() => setApplied(false)} resetLabel="Submit another">
              <p>We'll review your details and email you within 2 business days (demo — nothing was sent).</p>
            </SuccessCard>
          ) : (
            <form className="card form" onSubmit={handleSubmit}>
              <div className="field-row">
                <label className="field">
                  <span>Name</span>
                  <input name="name" required autoComplete="name" />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input name="email" type="email" required autoComplete="email" />
                </label>
              </div>
              <label className="field">
                <span>Website or channel</span>
                <input name="site" type="url" required placeholder="https://" />
              </label>
              <label className="field">
                <span>Monthly audience</span>
                <select name="audience" defaultValue="1k-10k">
                  <option value="<1k">Under 1,000</option>
                  <option value="1k-10k">1,000 – 10,000</option>
                  <option value="10k-100k">10,000 – 100,000</option>
                  <option value="100k+">100,000+</option>
                </select>
              </label>
              <button type="submit" className="btn btn-primary form-submit">
                Apply Now
              </button>
            </form>
          )}
        </div>
      </section>
    </>
  )
}
