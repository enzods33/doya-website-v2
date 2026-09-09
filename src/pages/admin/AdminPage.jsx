import { useEffect, useState } from 'react'
import { supabase } from '../../commerce/supabase.js'
import {
  adminAuthCheck,
  signInAdminGoogle,
  signOutAdmin,
} from '../../commerce/admin.js'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { Wordmark, Stars } from '../../components/Brand.jsx'
import Link from '../../components/Link.jsx'
import AdminConcerts from './AdminConcerts.jsx'
import AdminBio from './AdminBio.jsx'
import AdminNewsletter from './AdminNewsletter.jsx'
import AdminSales from './AdminSales.jsx'
import AdminStocks from './AdminStocks.jsx'
import AdminPromos from './AdminPromos.jsx'
import AdminAudience from './AdminAudience.jsx'
import lunaPhases from '../../assets/hero/luna-phases.webp'

const TAB_STORAGE_KEY = 'doya-admin-tab'

/** Site = contenu public · Boutique = opérations commerce. */
const TAB_GROUPS = [
  {
    id: 'site',
    labelKey: 'admin.groupSite',
    tabs: [
      { id: 'concerts', labelKey: 'admin.tabConcerts' },
      { id: 'bio', labelKey: 'admin.tabBio' },
      { id: 'newsletter', labelKey: 'admin.tabNewsletter' },
    ],
  },
  {
    id: 'shop',
    labelKey: 'admin.groupShop',
    tabs: [
      { id: 'orders', labelKey: 'admin.tabOrders' },
      { id: 'catalog', labelKey: 'admin.tabCatalog' },
      { id: 'promos', labelKey: 'admin.tabPromos' },
      { id: 'stats', labelKey: 'admin.tabStats' },
    ],
  },
]

const ALL_TAB_IDS = TAB_GROUPS.flatMap((group) => group.tabs.map((tab) => tab.id))

/** Anciens ids → nouveaux (favoris / session). */
const TAB_ALIASES = {
  dates: 'concerts',
  photos: 'bio',
  sales: 'orders',
  stocks: 'catalog',
  audience: 'stats',
}

function readStoredTab() {
  try {
    const raw = sessionStorage.getItem(TAB_STORAGE_KEY)
    if (!raw) return 'orders'
    const mapped = TAB_ALIASES[raw] || raw
    return ALL_TAB_IDS.includes(mapped) ? mapped : 'orders'
  } catch {
    return 'orders'
  }
}

function GoogleButton({ disabled, onClick, label }) {
  return (
    <button type="button" className="admin-google-btn" disabled={disabled} onClick={onClick}>
      <span className="admin-google-btn-icon" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" focusable="false">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
      </span>
      <span className="admin-google-btn-label">{label}</span>
    </button>
  )
}

function AdminLoginStage({ children }) {
  return (
    <div className="admin-login-stage">
      <div className="admin-login-cluster">
        <div className="admin-login-orbit" aria-hidden="true">
          <img
            className="admin-login-phases"
            src={lunaPhases}
            alt=""
            width={1024}
            height={1024}
            decoding="async"
            draggable={false}
          />
        </div>
        <div className="admin-login-card">{children}</div>
      </div>
    </div>
  )
}

function AdminPage() {
  const { t } = useI18n()
  const [boot, setBoot] = useState(true)
  const [session, setSession] = useState(null)
  const [allowed, setAllowed] = useState(false)
  const [forbidden, setForbidden] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState(readStoredTab)

  function selectTab(next) {
    setTab(next)
    try {
      sessionStorage.setItem(TAB_STORAGE_KEY, next)
    } catch {
      /* private mode */
    }
  }

  useEffect(() => {
    let cancelled = false

    async function sync(nextSession) {
      setError('')
      if (!nextSession) {
        setSession(null)
        setAllowed(false)
        setBoot(false)
        return
      }
      setSession(nextSession)
      try {
        await adminAuthCheck()
        if (!cancelled) {
          setForbidden(false)
          setAllowed(true)
          setBoot(false)
        }
      } catch (caught) {
        const isForbidden = caught.message === 'admin_forbidden'
        await signOutAdmin()
        if (!cancelled) {
          setSession(null)
          setAllowed(false)
          setForbidden(isForbidden)
          setError(isForbidden ? '' : t('admin.authError'))
          setBoot(false)
        }
      }
    }

    if (!supabase) {
      setError(t('admin.unavailable'))
      setBoot(false)
      return undefined
    }

    supabase.auth.getSession().then(({ data }) => sync(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      sync(next)
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [t])

  async function onGoogle() {
    setBusy(true)
    setError('')
    setForbidden(false)
    try {
      await signInAdminGoogle()
    } catch {
      setError(t('admin.authError'))
      setBusy(false)
    }
  }

  async function onSignOut() {
    await signOutAdmin()
    setAllowed(false)
    setSession(null)
    setForbidden(false)
  }

  const showGate = !allowed

  return (
    <main id="main" className={`admin-shell${showGate ? ' is-gate' : ''}`} tabIndex={-1}>
      <header className="admin-top">
        <div className="admin-brand">
          <Wordmark className="admin-wordmark" />
          <p className="admin-kicker">
            <Stars className="admin-stars" />
            <span>{t('admin.kicker')}</span>
          </p>
        </div>
        <div className="admin-user">
          <Link href="/" className="admin-site-link">{t('admin.viewSite')}</Link>
          {allowed && session ? (
            <>
              <span className="admin-user-email">{session.user?.email}</span>
              <button type="button" className="admin-ghost" onClick={onSignOut}>{t('admin.signOut')}</button>
            </>
          ) : null}
        </div>
      </header>

      {boot ? (
        <AdminLoginStage>
          <p className="admin-login-status">{t('admin.loading')}</p>
        </AdminLoginStage>
      ) : forbidden ? (
        <AdminLoginStage>
          <h1 className="editorial-title admin-login-title" id="admin-forbidden-title">
            {t('admin.forbiddenTitle')}
          </h1>
          <div className="admin-login-actions">
            <Link href="/" className="admin-primary admin-forbidden-home">
              {t('admin.forbiddenHome')}
            </Link>
            <GoogleButton
              disabled={busy || !supabase}
              onClick={onGoogle}
              label={busy ? t('admin.redirecting') : t('admin.forbiddenRetry')}
            />
          </div>
        </AdminLoginStage>
      ) : !allowed ? (
        <AdminLoginStage>
          <h1 className="editorial-title admin-login-title">{t('admin.gateTitle')}</h1>
          <p className="admin-login-lead">{t('admin.gateText')}</p>
          {error ? <p className="admin-error" role="alert">{error}</p> : null}
          <div className="admin-login-actions">
            <GoogleButton
              disabled={busy || !supabase}
              onClick={onGoogle}
              label={busy ? t('admin.redirecting') : t('admin.google')}
            />
          </div>
        </AdminLoginStage>
      ) : (
        <>
          <nav className="admin-tabs" aria-label={t('admin.nav')}>
            {TAB_GROUPS.map((group) => (
              <div key={group.id} className="admin-tabs-group">
                <p className="admin-tabs-group-label">{t(group.labelKey)}</p>
                <div
                  className="admin-tabs-row"
                  role="tablist"
                  aria-label={t(group.labelKey)}
                >
                  {group.tabs.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={tab === item.id}
                      className={tab === item.id ? 'is-active' : undefined}
                      onClick={() => selectTab(item.id)}
                    >
                      {t(item.labelKey)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
          <div className="admin-panel">
            {tab === 'concerts' ? <AdminConcerts /> : null}
            {tab === 'bio' ? <AdminBio /> : null}
            {tab === 'newsletter' ? <AdminNewsletter /> : null}
            {tab === 'orders' ? <AdminSales /> : null}
            {tab === 'catalog' ? <AdminStocks /> : null}
            {tab === 'promos' ? <AdminPromos /> : null}
            {tab === 'stats' ? <AdminAudience /> : null}
          </div>
        </>
      )}
    </main>
  )
}

export default AdminPage
