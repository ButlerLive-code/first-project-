import { useState, type CSSProperties } from 'react'
import { useT } from '../i18n/useT'
import avatar1 from '../assets/avatar-1.png'
import avatar2 from '../assets/avatar-2.png'
import avatar3 from '../assets/avatar-3.png'

const testimonials = [
  {
    name: 'Viezh Robert', // i18n-ignore
    avatar: avatar1,
    rating: 4.5,
  },
  {
    name: 'Yessica Christy', // i18n-ignore
    avatar: avatar2,
    rating: 4.5,
  },
  {
    name: 'Kim Young Jou', // i18n-ignore
    avatar: avatar3,
    rating: 4.5,
  },
]

function Arrow() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
      <path
        fill="currentColor"
        d="M23.75 13.75H8.92l4.54-5.45a1.25 1.25 0 1 0-1.92-1.6l-6.25 7.5-.11.19-.09.16a1.24 1.24 0 0 0 0 .9l.09.16.11.19 6.25 7.5a1.25 1.25 0 0 0 1.92-1.6l-4.54-5.45h14.83a1.25 1.25 0 1 0 0-2.5Z"
      />
    </svg>
  )
}

export function Testimonials() {
  const t = useT()
  const [active, setActive] = useState(0)
  const last = testimonials.length - 1

  return (
    <section className="testimonials" id="testimonials">
      <div className="container">
        <div className="section-head">
          <h2 className="section-title">{t.testimonials.title}</h2>
          <p>
            {t.testimonials.text}
          </p>
        </div>
      </div>

      <div className="container testimonials-viewport">
        <ul className="testimonials-track" style={{ '--index': active } as CSSProperties}>
          {testimonials.map((item, i) => (
            <li key={item.name} className={`testimonial${i === active ? ' is-active' : ''}`}>
              <div className="testimonial-head">
                <img src={item.avatar} alt="" width={50} height={50} />
                <div>
                  <p className="testimonial-name">{item.name}</p>
                  <p className="testimonial-location">{t.testimonials.items[i].location}</p>
                </div>
                <p className="testimonial-rating">
                  {item.rating}
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-label={t.testimonials.stars}>
                    <path
                      fill="#FEA250"
                      d="m14.4 5.4-4.1-.6L8.5 1.1a.6.6 0 0 0-1 0L5.7 4.8l-4.1.6a.6.6 0 0 0-.3 1l3 2.9-.7 4a.6.6 0 0 0 .8.6L8 12l3.6 1.9a.6.6 0 0 0 .8-.6l-.7-4 3-2.9a.6.6 0 0 0-.3-1Z"
                    />
                  </svg>
                </p>
              </div>
              <p className="testimonial-text">{t.testimonials.items[i].text}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="container testimonials-controls">
        <div className="testimonials-dots">
          {testimonials.map((item, i) => (
            <button
              key={item.name}
              type="button"
              aria-label={t.testimonials.showReview(i + 1)}
              className={i === active ? 'is-active' : ''}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
        <div className="testimonials-arrows">
          <button
            type="button"
            aria-label={t.testimonials.previous}
            className="arrow"
            disabled={active === 0}
            onClick={() => setActive((i) => i - 1)}
          >
            <Arrow />
          </button>
          <button
            type="button"
            aria-label={t.testimonials.next}
            className="arrow arrow-next"
            disabled={active === last}
            onClick={() => setActive((i) => i + 1)}
          >
            <Arrow />
          </button>
        </div>
      </div>
    </section>
  )
}
