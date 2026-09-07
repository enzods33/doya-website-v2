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
import AdminAudience from './AdminAudience.jsx'

const TAB_ROWS = [
  [
    { id: 'dates', labelKey: 'admin.tabDates' },
    { id: 'photos', labelKey: 'admin.tabPhotos' },
    { id: 'newsletter', labelKey: 'admin.tabNewsletter' },
  ],
  [
    { id: 'sales', labelKey: 'admin.tabSales' },
    { id: 'audience', labelKey: 'admin.tabAudience' },
  ],
]

function AdminPage() {
  const { t } = useI18n()
  const [boot, setBoot] = useState(true)
  const [session, setSession] = useState(null)
  const [allowed, setAllowed] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState('dates')

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
          setAllowed(true)
          setBoot(false)
        }
      } catch (caught) {
        await signOutAdmin()
        if (!cancelled) {
          setSession(null)
          setAllowed(false)
          setError(caught.message === 'admin_forbidden' ? t('admin.forbidden') : t('admin.authError'))
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
  }

  return (
    <main id="main" className="admin-shell" tabIndex={-1}>
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
        <p className="admin-status">{t('admin.loading')}</p>
      ) : !allowed ? (
        <section className="admin-gate">
          <h1 className="editorial-title admin-title">{t('admin.gateTitle')}</h1>
          <p className="admin-lead">{t('admin.gateText')}</p>
          {error ? <p className="admin-error" role="alert">{error}</p> : null}
          <button type="button" className="admin-primary" disabled={busy || !supabase} onClick={onGoogle}>
            {busy ? t('admin.redirecting') : t('admin.google')}
          </button>
        </section>
      ) : (
        <>
          <nav className="admin-tabs" aria-label={t('admin.nav')}>
            {TAB_ROWS.map((row, rowIndex) => (
              <div key={rowIndex} className="admin-tabs-row" style={{ '--admin-tabs-cols': row.length }}>
                {row.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={tab === item.id ? 'is-active' : undefined}
                    onClick={() => setTab(item.id)}
                  >
                    {t(item.labelKey)}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <div className="admin-panel">
            {tab === 'dates' ? <AdminConcerts /> : null}
            {tab === 'photos' ? <AdminBio /> : null}
            {tab === 'newsletter' ? <AdminNewsletter /> : null}
            {tab === 'sales' ? <AdminSales /> : null}
            {tab === 'audience' ? <AdminAudience /> : null}
          </div>
        </>
      )}
    </main>
  )
}

export default AdminPage
