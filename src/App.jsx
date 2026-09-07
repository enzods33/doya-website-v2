import { useEffect } from 'react'
import { LazyMotion, MotionConfig, domAnimation } from 'motion/react'
import { CartProvider } from './commerce/CartProvider.jsx'
import { CatalogProvider } from './commerce/CatalogProvider.jsx'
import { startPageAnalytics } from './commerce/pageAnalytics.js'
import { I18nProvider, useI18n } from './i18n/I18nProvider.jsx'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import HomePage from './pages/HomePage.jsx'
import CartPage from './pages/CartPage.jsx'
import OrderPage from './pages/OrderPage.jsx'
import AdminPage from './pages/admin/AdminPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import { scrollToHash, useRoute } from './utils/router.js'

const pages = {
  '/': HomePage,
  '/panier': CartPage,
  '/commande': OrderPage,
  '/admin': AdminPage,
}

function AppShell() {
  const { path } = useRoute()
  const { t } = useI18n()
  const Page = pages[path] ?? NotFoundPage
  const isAdmin = path === '/admin'

  useEffect(() => {
    if (window.location.hash) {
      requestAnimationFrame(() => scrollToHash(window.location.hash))
    }
  }, [path])

  useEffect(() => startPageAnalytics(), [])

  return (
    <div id="top" className={path === '/' || isAdmin ? undefined : 'site-page'}>
      <a className="skip-link" href="#main">{t('a11y.skipToContent')}</a>
      {!isAdmin ? <Header /> : null}
      <Page />
      {!isAdmin ? <Footer /> : null}
    </div>
  )
}

function App() {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <I18nProvider>
          <CartProvider>
            <CatalogProvider>
              <AppShell />
            </CatalogProvider>
          </CartProvider>
        </I18nProvider>
      </MotionConfig>
    </LazyMotion>
  )
}

export default App
