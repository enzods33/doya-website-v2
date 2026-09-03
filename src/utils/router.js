import { useEffect, useState } from 'react'

export function currentPath() {
  return window.location.pathname
}

export function navigate(to) {
  const url = new URL(to, window.location.origin)
  const next = `${url.pathname}${url.search}${url.hash}`
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (next !== current) {
    window.history.pushState({}, '', next)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
  if (url.hash) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => document.querySelector(url.hash)?.scrollIntoView())
    })
  } else {
    window.scrollTo(0, 0)
  }
}

export function useRoute() {
  const [route, setRoute] = useState(() => ({
    path: window.location.pathname,
    search: window.location.search,
  }))

  useEffect(() => {
    function onPop() {
      setRoute({ path: window.location.pathname, search: window.location.search })
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return route
}
