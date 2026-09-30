import { lazy, Suspense } from 'react'
import Hero from '../sections/hero/Hero.jsx'
import { Stars } from '../components/Brand.jsx'

const Music = lazy(() => import('../sections/music/Music.jsx'))
const Live = lazy(() => import('../sections/live/Live.jsx'))
const Shop = lazy(() => import('../sections/shop/Shop.jsx'))
const About = lazy(() => import('../sections/about/About.jsx'))

function HomePage() {
  return (
    <main id="main" tabIndex={-1}>
      <Hero />
      <Suspense fallback={null}>
        <Music />
        <div className="section-bridge section-bridge--music-about" aria-hidden="true">
          <Stars color="red" className="section-bridge-stars" />
        </div>
        <About />
        <div className="section-bridge section-bridge--gallery-live" aria-hidden="true">
          <Stars color="red" className="section-bridge-stars" />
        </div>
        <Live />
        <div className="section-bridge section-bridge--live-shop" aria-hidden="true">
          <Stars color="red" className="section-bridge-stars" />
        </div>
        <Shop />
      </Suspense>
    </main>
  )
}

export default HomePage
