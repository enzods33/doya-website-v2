import fr from '../i18n/locales/fr.js'

/** Fallback FR hors React. Préférer `t('commerce.*')` dans les composants. */
export const commerceMessages = { ...fr.commerce }

export function commerceMessage(code, t) {
  if (typeof t === 'function') {
    const key = `commerce.${code}`
    const value = t(key)
    return value === key ? t('commerce.fallback') : value
  }
  return commerceMessages[code] ?? fr.commerce.fallback
}

export function translateProduct(t, product) {
  if (!product) return { name: '', type: '', color: '' }
  const nameKey = `shop.product.${product.id}`
  const typeKey = `shop.type.${product.typeKey}`
  const colorKey = `shop.color.${product.colorKey}`
  const name = t(nameKey)
  const type = t(typeKey)
  const color = t(colorKey)
  const customType = product.typeKey === 'other' && product.type
    ? product.type
    : null
  return {
    name: name === nameKey ? (product.displayName || product.name || product.id) : name,
    type: customType || (type === typeKey ? (product.type || product.typeKey || '') : type),
    color: color === colorKey ? (product.color || product.colorKey || '') : color,
  }
}
