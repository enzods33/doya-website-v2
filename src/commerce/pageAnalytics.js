/** Suivi léger des pages vues (agrégé côté Postgres). */
import { commerceConfigured } from './config.js'
import { supabase } from './supabase.js'

const SKIP = /^\/admin/

function pagePath() {
  const path = (window.location.pathname || '/').toLowerCase()
  const hash = (window.location.hash || '').toLowerCase()
  if (path === '/' && hash && hash !== '#top') return `/${hash}`
  return path
}

export function startPageAnalytics() {
  if (!commerceConfigured || !supabase) return () => {}

  let last = ''
  let timer = 0

  function send() {
    const path = pagePath()
    if (SKIP.test(path) || path === last) return
    last = path
    supabase.rpc('record_pageview', { p_path: path }).then(({ error }) => {
      if (error) console.warn('pageview_failed', error.message)
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
    window.clearTimeout(timer)
    window.removeEventListener('popstate', schedule)
    window.removeEventListener('hashchange', schedule)
    history.pushState = push
    history.replaceState = replace
  }
}
