import { lazy, Suspense } from 'react'
import Hero from '../sections/hero/Hero.jsx'

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
        <Live />
        <Shop />
        <About />
      </Suspense>
    </main>
  )
}

export default HomePage
