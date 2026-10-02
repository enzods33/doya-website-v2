import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { products } from '../data/products.js'
import { loadCatalog } from './catalog.js'
import { commerceConfigured, demoStoreConfigured } from './config.js'
import { supabase } from './supabase.js'

const empty = products.map((product) => ({ ...product, sale: null, variants: [] }))
const RECOVERY_DELAYS = [2000, 5000, 15000, 30000]
const CatalogContext = createContext({
  items: empty,
  purchasable: false,
  ready: true,
  revision: 0,
  source: 'local',
  reload: () => {},
})

export function CatalogProvider({ children }) {
  const [catalog, setCatalog] = useState({
    items: empty,
    purchasable: false,
    ready: !commerceConfigured && !demoStoreConfigured,
    revision: 0,
    source: 'local',
  })
  const activeRef = useRef(true)
  const debounceRef = useRef(null)
  const recoveryRef = useRef(null)
  const recoveryAttemptRef = useRef(0)

  function clearRecovery() {
    if (recoveryRef.current) window.clearTimeout(recoveryRef.current)
    recoveryRef.current = null
  }

  function scheduleRecovery() {
    if (!activeRef.current || recoveryRef.current) return
    const index = Math.min(recoveryAttemptRef.current, RECOVERY_DELAYS.length - 1)
    const delay = RECOVERY_DELAYS[index]
    recoveryAttemptRef.current += 1
    recoveryRef.current = window.setTimeout(() => {
      recoveryRef.current = null
      reload().catch(() => scheduleRecovery())
    }, delay)
  }

  function applyCatalog(next) {
    const stableSource = next.source === 'remote' || next.source === 'demo'
    if (stableSource) {
      clearRecovery()
      recoveryAttemptRef.current = 0
    } else {
      scheduleRecovery()
    }

    setCatalog((current) => {
      // Une panne transitoire ne doit jamais effacer un catalogue déjà chargé.
      if (next.source !== 'remote' && current.source === 'remote') {
        return { ...current, ready: true }
      }
      if (next.source === 'local' && current.source === 'demo') {
        return { ...current, ready: true }
      }
      return {
        ...next,
        ready: true,
        revision: current.revision + 1,
      }
    })
  }

  function reload() {
    return loadCatalog().then((next) => {
      if (activeRef.current) applyCatalog(next)
      return next
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

    if (demoStoreConfigured) {
      reload().catch(() => {})
      return () => { activeRef.current = false }
    }

    if (!commerceConfigured || !supabase) {
      return () => { activeRef.current = false }
    }

    reload().catch(() => {
      if (activeRef.current) scheduleRecovery()
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
    function onOnline() {
      recoveryAttemptRef.current = 0
      clearRecovery()
      scheduleReload()
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)

    return () => {
      activeRef.current = false
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      clearRecovery()
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
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
