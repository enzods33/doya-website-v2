import Hero from '../sections/hero/Hero.jsx'
import Music from '../sections/music/Music.jsx'
import Live from '../sections/live/Live.jsx'
import Shop from '../sections/shop/Shop.jsx'
import About from '../sections/about/About.jsx'

function HomePage() {
  return (
    <main id="main" tabIndex={-1}>
      <Hero />
      <Music />
      <Live />
      <Shop />
      <About />
    </main>
  )
}

export default HomePage
