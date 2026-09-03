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
  return {
    name: t(`shop.product.${product.id}`),
    type: t(`shop.type.${product.typeKey}`),
    color: t(`shop.color.${product.colorKey}`),
  }
}
