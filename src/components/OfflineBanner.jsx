import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'

function OfflineBanner() {
  const { t } = useI18n()
  const [offline, setOffline] = useState(() => (
    typeof navigator !== 'undefined' ? navigator.onLine === false : false
  ))

  useEffect(() => {
    function goOffline() { setOffline(true) }
    function goOnline() { setOffline(false) }
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  if (!offline) return null

  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <p>{t('offline.banner')}</p>
    </div>
  )
}

export default OfflineBanner
