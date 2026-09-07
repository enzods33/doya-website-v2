/** Suivi léger pages vues + clics (agrégats Postgres, sans identité). */
import { commerceConfigured } from './config.js'

const SKIP = /^\/admin/

function pagePath() {
  const path = (window.location.pathname || '/').toLowerCase()
  const hash = (window.location.hash || '').toLowerCase()
  if (path === '/' && hash && hash !== '#top') return `/${hash}`
  return path
}

async function client() {
  if (!commerceConfigured) return null
  const { supabase } = await import('./supabase.js')
  return supabase
}

/** @param {string} event @param {string} place */
export function trackEvent(event, place) {
  if (!commerceConfigured) return
  if (SKIP.test(window.location.pathname || '/')) return
  client().then((supabase) => {
    if (!supabase) return
    supabase.rpc('record_event', { p_event: event, p_place: place }).then(({ error }) => {
      if (error) console.warn('event_failed', error.message)
    })
  })
}

export function startPageAnalytics() {
  if (!commerceConfigured) return () => {}

  let last = ''
  let timer = 0
  let stopped = false

  function send() {
    const path = pagePath()
    if (SKIP.test(path) || path === last) return
    last = path
    client().then((supabase) => {
      if (stopped || !supabase) return
      supabase.rpc('record_pageview', { p_path: path }).then(({ error }) => {
        if (error) console.warn('pageview_failed', error.message)
      })
    })
  }

  function schedule() {
    window.clearTimeout(timer)
    timer = window.setTimeout(send, 400)
  }

  schedule()
  window.addEventListener('popstate', schedule)
  window.addEventListener('hashchange', schedule)

  const push = history.pushState.bind(history)
  const replace = history.replaceState.bind(history)
  history.pushState = function patchedPush(...args) {
    const result = push(...args)
    schedule()
    return result
  }
  history.replaceState = function patchedReplace(...args) {
    const result = replace(...args)
    schedule()
    return result
  }

  return () => {
    stopped = true
    window.clearTimeout(timer)
    window.removeEventListener('popstate', schedule)
    window.removeEventListener('hashchange', schedule)
    history.pushState = push
    history.replaceState = replace
  }
}
