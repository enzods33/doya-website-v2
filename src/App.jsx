import { LazyMotion, MotionConfig, domAnimation } from 'motion/react'
import { AuthProvider } from './commerce/AuthProvider.jsx'
import { CartProvider } from './commerce/CartProvider.jsx'
import { CatalogProvider } from './commerce/CatalogProvider.jsx'
import { I18nProvider, useI18n } from './i18n/I18nProvider.jsx'
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

function AppShell() {
  const { path } = useRoute()
  const { t } = useI18n()
  const Page = pages[path] ?? NotFoundPage

  return (
    <div id="top" className={path === '/' ? undefined : 'site-page'}>
      <a className="skip-link" href="#main">{t('a11y.skipToContent')}</a>
      <Header />
      <Page />
      <Footer />
    </div>
  )
}

function App() {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <I18nProvider>
          <AuthProvider>
            <CartProvider>
              <CatalogProvider>
                <AppShell />
              </CatalogProvider>
            </CartProvider>
          </AuthProvider>
        </I18nProvider>
      </MotionConfig>
    </LazyMotion>
  )
}

export default App
