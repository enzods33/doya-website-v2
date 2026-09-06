import { useEffect, useState } from 'react'

const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')

function stripBase(pathname) {
  if (BASE && pathname.startsWith(BASE)) return pathname.slice(BASE.length) || '/'
  return pathname || '/'
}

function withBase(pathname) {
  if (!pathname.startsWith('/')) return pathname
  return `${BASE}${pathname}` || '/'
}

export function currentPath() {
  return stripBase(window.location.pathname)
}

/**
 * Scroll vers une ancre en respectant `scroll-margin-top` (hauteur header).
 * Réessaie si la cible n’est pas encore montée (ex. /panier → /#shop).
 */
export function scrollToHash(hash, { retries = 12 } = {}) {
  if (!hash || hash === '#') return
  if (hash === '#top') {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    return
  }
  const target = document.querySelector(hash)
  if (!target) {
    if (retries > 0) {
      requestAnimationFrame(() => scrollToHash(hash, { retries: retries - 1 }))
    }
    return
  }
  target.scrollIntoView({ block: 'start', behavior: 'auto' })
}

export function navigate(to) {
  const url = new URL(to, window.location.href)
  const path = stripBase(url.pathname)
  const next = `${withBase(path)}${url.search}${url.hash}`
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (next !== current) {
    window.history.pushState({}, '', next)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
  if (url.hash) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToHash(url.hash)
      })
    })
  } else if (next !== current) {
    window.scrollTo(0, 0)
  }
}

export function useRoute() {
  const [route, setRoute] = useState(() => ({
    path: stripBase(window.location.pathname),
    search: window.location.search,
  }))

  useEffect(() => {
    function onPop() {
      setRoute({ path: stripBase(window.location.pathname), search: window.location.search })
      if (window.location.hash) {
        requestAnimationFrame(() => scrollToHash(window.location.hash))
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return route
}
