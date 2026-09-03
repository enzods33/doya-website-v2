import { LazyMotion, MotionConfig, domAnimation } from 'motion/react'
import { AuthProvider } from './commerce/AuthProvider.jsx'
import { CartProvider } from './commerce/CartProvider.jsx'
import { CatalogProvider } from './commerce/CatalogProvider.jsx'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import HomePage from './pages/HomePage.jsx'
import CartPage from './pages/CartPage.jsx'
import AccountPage from './pages/AccountPage.jsx'
import OrderPage from './pages/OrderPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import { useRoute } from './utils/router.js'

const pages = {
  '/': HomePage,
  '/panier': CartPage,
  '/compte': AccountPage,
  '/commande': OrderPage,
}

function App() {
  const { path } = useRoute()
  const Page = pages[path] ?? NotFoundPage

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <CartProvider>
            <CatalogProvider>
              <div id="top" className={path === '/' ? undefined : 'site-page'}>
                <a className="skip-link" href="#main">Aller au contenu</a>
                <Header />
                <Page />
                <Footer />
              </div>
            </CatalogProvider>
          </CartProvider>
        </AuthProvider>
      </MotionConfig>
    </LazyMotion>
  )
}

export default App
