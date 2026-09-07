import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { loadLocaleMessages, resolveInitialLocale } from './i18n/index.js'
import './styles/index.css'

async function boot() {
  await loadLocaleMessages(resolveInitialLocale())
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

boot()
