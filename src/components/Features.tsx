import illustration from '../assets/features.svg'
import check from '../assets/check.svg'

const features = [
  'Powerfull online protection.',
  'Internet without borders.',
  'Supercharged VPN',
  'No specific time limits.',
]

export function Features() {
  return (
    <section className="features container" id="features">
      <img className="features-image" src={illustration} alt="" width={508} height={415} />
      <div className="features-content">
        <h2 className="section-title">We Provide Many Features You Can Use</h2>
        <p className="features-text">
          You can explore the features that we provide with fun and have their own functions each
          feature.
        </p>
        <ul className="features-list">
          {features.map((feature) => (
            <li key={feature}>
              <img src={check} alt="" width={24} height={24} />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
