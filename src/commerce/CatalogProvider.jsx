import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { products } from '../data/products.js'
import { loadCatalog } from './catalog.js'
import { commerceConfigured } from './config.js'

const empty = products.map((product) => ({ ...product, sale: null, variants: [] }))
const CatalogContext = createContext({ items: empty, purchasable: false, ready: true, reload: () => {} })

export function CatalogProvider({ children }) {
  const [catalog, setCatalog] = useState({ items: empty, purchasable: false, ready: !commerceConfigured })

  function reload() {
    return loadCatalog().then((next) => {
      setCatalog({ ...next, ready: true })
    })
  }

  useEffect(() => {
    if (!commerceConfigured) return undefined
    let active = true
    loadCatalog().then((next) => {
      if (active) setCatalog({ ...next, ready: true })
    })
    return () => { active = false }
  }, [])

  const value = useMemo(() => ({ ...catalog, reload }), [catalog])
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog() {
  return useContext(CatalogContext)
}
