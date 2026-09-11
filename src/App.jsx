import { lazy, Suspense, useEffect } from 'react'
import { LazyMotion, MotionConfig, domAnimation } from 'motion/react'
import { CartProvider } from './commerce/CartProvider.jsx'
import { CatalogProvider } from './commerce/CatalogProvider.jsx'
import { startPageAnalytics } from './commerce/pageAnalytics.js'
import { I18nProvider, useI18n } from './i18n/I18nProvider.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import OfflineBanner from './components/OfflineBanner.jsx'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import ListenDock from './components/ListenDock.jsx'
import HomePage from './pages/HomePage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import { scrollToHash, useRoute } from './utils/router.js'
import { applyDocumentSeo } from './utils/seo.js'

const CartPage = lazy(() => import('./pages/CartPage.jsx'))
const OrderPage = lazy(() => import('./pages/OrderPage.jsx'))
const AdminPage = lazy(() => import('./pages/admin/AdminPage.jsx'))
const MentionsLegalesPage = lazy(() => import('./pages/LegalPages.jsx').then((m) => ({ default: m.MentionsLegalesPage })))
const CgvPage = lazy(() => import('./pages/LegalPages.jsx').then((m) => ({ default: m.CgvPage })))
const PrivacyPage = lazy(() => import('./pages/LegalPages.jsx').then((m) => ({ default: m.PrivacyPage })))

const pages = {
  '/': HomePage,
  '/panier': CartPage,
  '/commande': OrderPage,
  '/admin': AdminPage,
  '/mentions-legales': MentionsLegalesPage,
  '/cgv': CgvPage,
  '/confidentialite': PrivacyPage,
}

const indexable = import.meta.env.VITE_INDEXABLE === 'true'

function AppShell() {
  const { path } = useRoute()
  const { t, locale, intlLocale } = useI18n()
  const Page = pages[path] ?? NotFoundPage
  const isAdmin = path === '/admin'

  useEffect(() => {
    if (window.location.hash) {
      requestAnimationFrame(() => scrollToHash(window.location.hash))
    }
  }, [path])

  useEffect(() => startPageAnalytics(), [])

  useEffect(() => {
    applyDocumentSeo({ path, locale, intlLocale, t, indexable })
  }, [path, locale, intlLocale, t])

  return (
    <div id="top" className={path === '/' || isAdmin ? undefined : 'site-page'}>
      <a className="skip-link" href="#main">{t('a11y.skipToContent')}</a>
      {!isAdmin ? <Header /> : null}
      <OfflineBanner />
      <ErrorBoundary resetKey={path}>
        <Suspense fallback={<main id="main" className="page-main" tabIndex={-1} />}>
          <Page />
        </Suspense>
      </ErrorBoundary>
      {!isAdmin ? <Footer /> : null}
      {path === '/' ? <ListenDock /> : null}
    </div>
  )
}

function App() {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <I18nProvider>
          <ErrorBoundary resetKey="app-root">
            <CartProvider>
              <CatalogProvider>
                <AppShell />
              </CatalogProvider>
            </CartProvider>
          </ErrorBoundary>
        </I18nProvider>
      </MotionConfig>
    </LazyMotion>
  )
}

export default App
