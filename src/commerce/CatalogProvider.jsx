import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { products } from '../data/products.js'
import { loadCatalog } from './catalog.js'

const empty = products.map((product) => ({ ...product, sale: null, variants: [] }))
const CatalogContext = createContext({ items: empty, purchasable: false, ready: true, reload: () => {} })

export function CatalogProvider({ children }) {
  const [catalog, setCatalog] = useState({ items: empty, purchasable: false, ready: false })

  async function reload() {
    const next = await loadCatalog()
    setCatalog({ ...next, ready: true })
  }

  useEffect(() => {
    reload()
  }, [])

  const value = useMemo(() => ({ ...catalog, reload }), [catalog])
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog() {
  return useContext(CatalogContext)
}
