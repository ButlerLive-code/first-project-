import { useState, type CSSProperties } from 'react'
import avatar1 from '../assets/avatar-1.png'
import avatar2 from '../assets/avatar-2.png'
import avatar3 from '../assets/avatar-3.png'

const testimonials = [
  {
    name: 'Viezh Robert',
    location: 'Warsaw, Poland',
    avatar: avatar1,
    rating: 4.5,
    text: '“Wow... I am very happy to use this VPN, it turned out to be more than my expectations and so far there have been no problems. LaslesVPN always the best”.',
  },
  {
    name: 'Yessica Christy',
    location: 'Shanxi, China',
    avatar: avatar2,
    rating: 4.5,
    text: '“I like it because I like to travel far and still can connect with high speed.”.',
  },
  {
    name: 'Kim Young Jou',
    location: 'Seoul, South Korea',
    avatar: avatar3,
    rating: 4.5,
    text: '“This is very unusual for my business that currently requires a virtual private network that has high security.”.',
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
  const [active, setActive] = useState(0)
  const last = testimonials.length - 1

  return (
    <section className="testimonials" id="testimonials">
      <div className="container">
        <div className="section-head">
          <h2 className="section-title">Trusted by Thousands of Happy Customer</h2>
          <p>
            These are the stories of our customers who have joined us with great pleasure when
            using this crazy feature.
          </p>
        </div>
      </div>

      <div className="container testimonials-viewport">
        <ul className="testimonials-track" style={{ '--index': active } as CSSProperties}>
          {testimonials.map((t, i) => (
            <li key={t.name} className={`testimonial${i === active ? ' is-active' : ''}`}>
              <div className="testimonial-head">
                <img src={t.avatar} alt="" width={50} height={50} />
                <div>
                  <p className="testimonial-name">{t.name}</p>
                  <p className="testimonial-location">{t.location}</p>
                </div>
                <p className="testimonial-rating">
                  {t.rating}
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-label="stars">
                    <path
                      fill="#FEA250"
                      d="m14.4 5.4-4.1-.6L8.5 1.1a.6.6 0 0 0-1 0L5.7 4.8l-4.1.6a.6.6 0 0 0-.3 1l3 2.9-.7 4a.6.6 0 0 0 .8.6L8 12l3.6 1.9a.6.6 0 0 0 .8-.6l-.7-4 3-2.9a.6.6 0 0 0-.3-1Z"
                    />
                  </svg>
                </p>
              </div>
              <p className="testimonial-text">{t.text}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="container testimonials-controls">
        <div className="testimonials-dots">
          {testimonials.map((t, i) => (
            <button
              key={t.name}
              type="button"
              aria-label={`Show review ${i + 1}`}
              className={i === active ? 'is-active' : ''}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
        <div className="testimonials-arrows">
          <button
            type="button"
            aria-label="Previous"
            className="arrow"
            disabled={active === 0}
            onClick={() => setActive((i) => i - 1)}
          >
            <Arrow />
          </button>
          <button
            type="button"
            aria-label="Next"
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
