import { Hero } from '../components/Hero'
import { Features } from '../components/Features'
import { Pricing } from '../components/Pricing'
import { Network } from '../components/Network'
import { Testimonials } from '../components/Testimonials'
import { usePageMeta } from '../i18n/usePageMeta'

export function Home() {
  usePageMeta()
  return (
    <>
      <Hero />
      <Features />
      <div className="gradient-bg">
        <Pricing />
        <Network />
      </div>
      <Testimonials />
    </>
  )
}
