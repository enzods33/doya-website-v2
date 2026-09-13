import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { loadLocaleMessages, resolveInitialLocale } from './i18n/index.js'
import './styles/index.css'

function resetInitialHomePosition() {
  if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'

  const basePath = (new URL(import.meta.env.BASE_URL || '/', window.location.origin).pathname.replace(/\/$/, '') || '/')
  const currentPath = window.location.pathname.replace(/\/$/, '') || '/'
  if (currentPath !== basePath) return

  if (window.location.hash) {
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`)
  }
  window.scrollTo(0, 0)
}

async function boot() {
  resetInitialHomePosition()
  await loadLocaleMessages(resolveInitialLocale())
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

boot()
