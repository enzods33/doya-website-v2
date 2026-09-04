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
  } else {
    window.scrollTo(0, 0)
  }
}

function scrollToHash(hash) {
  const target = document.querySelector(hash)
  if (!target) return
  const header = document.querySelector('.site-header')
  const offset = header ? header.getBoundingClientRect().height : 56
  const top = target.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({ top: Math.max(0, top), left: 0, behavior: 'auto' })
}

export function useRoute() {
  const [route, setRoute] = useState(() => ({
    path: stripBase(window.location.pathname),
    search: window.location.search,
  }))

  useEffect(() => {
    function onPop() {
      setRoute({ path: stripBase(window.location.pathname), search: window.location.search })
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return route
}
