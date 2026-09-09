import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { products } from '../data/products.js'
import { loadCatalog } from './catalog.js'
import { commerceConfigured } from './config.js'
import { supabase } from './supabase.js'

const empty = products.map((product) => ({ ...product, sale: null, variants: [] }))
const CatalogContext = createContext({
  items: empty,
  purchasable: false,
  ready: true,
  revision: 0,
  reload: () => {},
})

export function CatalogProvider({ children }) {
  const [catalog, setCatalog] = useState({
    items: empty,
    purchasable: false,
    ready: !commerceConfigured,
    revision: 0,
  })
  const activeRef = useRef(true)
  const debounceRef = useRef(null)

  function applyCatalog(next) {
    setCatalog((current) => ({
      ...next,
      ready: true,
      revision: current.revision + 1,
    }))
  }

  function reload() {
    return loadCatalog().then((next) => {
      if (activeRef.current) applyCatalog(next)
    })
  }

  function scheduleReload() {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null
      reload().catch(() => {})
    }, 250)
  }

  useEffect(() => {
    activeRef.current = true
    if (!commerceConfigured || !supabase) {
      return () => { activeRef.current = false }
    }

    reload().catch(() => {
      if (activeRef.current) {
        setCatalog({ items: empty, purchasable: false, ready: true, revision: 1 })
      }
    })

    const channel = supabase
      .channel('catalog-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'catalog_revision' },
        () => { scheduleReload() },
      )
      .subscribe()

    function onVisible() {
      if (document.visibilityState === 'visible') scheduleReload()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      activeRef.current = false
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      document.removeEventListener('visibilitychange', onVisible)
      supabase.removeChannel(channel)
    }
  }, [])

  const value = useMemo(
    () => ({ ...catalog, reload }),
    [catalog],
  )
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog() {
  return useContext(CatalogContext)
}
