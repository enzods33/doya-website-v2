import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { mergeCartLine, validateCartItems } from './cartRules.js'

const STORAGE_KEY = 'doya.cart.v1'
const CartContext = createContext({
  items: [],
  count: 0,
  addItem: () => ({ ok: false }),
  setQuantity: () => ({ ok: false }),
  removeItem: () => {},
  clear: () => {},
})

function readCart() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]')
    const result = validateCartItems(parsed)
    return result.ok ? result.items : []
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readCart)

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const value = useMemo(() => ({
    items,
    count: items.reduce((total, item) => total + item.quantity, 0),
    addItem(productId, size, quantity = 1, available) {
      const merged = mergeCartLine(items, productId, size, quantity)
      if (!merged.ok) return merged
      const line = merged.items.find((item) => item.productId === productId && item.size === size)
      if (Number.isInteger(available) && line && line.quantity > available) {
        return { ok: false, error: 'out_of_stock' }
      }
      setItems(merged.items)
      return merged
    },
    setQuantity(productId, size, quantity, available) {
      if (quantity <= 0) {
        setItems(items.filter((item) => !(item.productId === productId && item.size === size)))
        return { ok: true, items: [] }
      }
      const next = items.map((item) => (item.productId === productId && item.size === size ? { ...item, quantity } : item))
      const result = validateCartItems(next)
      if (!result.ok) return result
      if (Number.isInteger(available) && quantity > available) return { ok: false, error: 'out_of_stock' }
      setItems(result.items)
      return result
    },
    removeItem(productId, size) {
      setItems(items.filter((item) => !(item.productId === productId && item.size === size)))
    },
    clear() {
      setItems([])
    },
  }), [items])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  return useContext(CartContext)
}
