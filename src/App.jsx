import { LazyMotion, MotionConfig, domAnimation } from 'motion/react'
import Header from './components/Header.jsx'
import Hero from './sections/hero/Hero.jsx'
import Music from './sections/music/Music.jsx'
import Editorial from './sections/editorial/Editorial.jsx'
import Photography from './sections/photography/Photography.jsx'
import Live from './sections/live/Live.jsx'
import Shop from './sections/shop/Shop.jsx'
import About from './sections/about/About.jsx'
import Footer from './components/Footer.jsx'

function App() {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <div id="top">
          <a className="skip-link" href="#main">Aller au contenu</a>
          <Header />
          <main id="main" tabIndex={-1}>
            <Hero />
            <Music />
            <Editorial />
            <Photography />
            <Live />
            <Shop />
            <About />
          </main>
          <Footer />
        </div>
      </MotionConfig>
    </LazyMotion>
  )
}

export default App
