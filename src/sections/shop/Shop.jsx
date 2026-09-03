import { useState } from 'react'
import { CART_LIMITS, formatEuros } from '../../commerce/cartRules.js'
import { availableFor } from '../../commerce/catalog.js'
import { useCart } from '../../commerce/CartProvider.jsx'
import { useCatalog } from '../../commerce/CatalogProvider.jsx'
import { commerceMessage, translateProduct } from '../../commerce/messages.js'
import { isExternalUrl } from '../../utils/links.js'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import Reveal from '../../components/Reveal.jsx'
import TransitionImage from '../../components/TransitionImage.jsx'
import Link from '../../components/Link.jsx'

function Shop() {
  const [view, setView] = useState('back')
  const [hoveredProduct, setHoveredProduct] = useState(null)
  const [selectedSizes, setSelectedSizes] = useState({})
  const [notice, setNotice] = useState('')
  const { items, purchasable } = useCatalog()
  const { addItem } = useCart()
  const { t, intlLocale } = useI18n()

  function previewOtherSide(event, id) {
    if (event.pointerType === 'mouse' && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      setHoveredProduct(id)
    }
  }

  function addProduct(product) {
    const size = selectedSizes[product.id]
    if (!size) {
      setNotice(commerceMessage('choose_size', t))
      return
    }
    const result = addItem(product.id, size, 1, availableFor(product, size))
    setNotice(result.ok ? commerceMessage('added', t) : commerceMessage(result.error, t))
  }

  return (
    <section id="shop" className="shop-section section-shell" aria-labelledby="shop-title">
      <Reveal as="header" className="section-heading"><div><p className="eyebrow section-kicker">{t('shop.label')}</p><h2 id="shop-title" className="editorial-title">{t('shop.title')}</h2></div>
        <div className="product-view-controls" role="group" aria-label={t('shop.viewGroup')}>
          <button type="button" aria-pressed={view === 'front'} onClick={() => setView('front')}>{t('shop.viewFront')}</button>
          <span aria-hidden="true">/</span>
          <button type="button" aria-pressed={view === 'back'} onClick={() => setView('back')}>{t('shop.viewBack')}</button>
        </div>
      </Reveal>
      <div className="products">
        {items.map((product, index) => {
          const labels = translateProduct(t, product)
          const displayedView = hoveredProduct === product.id ? (view === 'back' ? 'front' : 'back') : view
          const sale = product.sale
          return <Reveal as="article" className="product" key={product.id} delay={(index % 2) * 0.08}
            onPointerEnter={(event) => previewOtherSide(event, product.id)} onPointerLeave={() => setHoveredProduct(null)}>
          <TransitionImage image={{ src: product[displayedView], width: product.width, height: product.height }} className="product-image" alt={t('shop.productAlt', { type: labels.type, name: labels.name, color: labels.color.toLowerCase(), view: displayedView === 'front' ? t('shop.viewFrontWord') : t('shop.viewBackWord') })} />
          <div className="product-caption"><p className="eyebrow">{labels.type}</p><h3>{labels.name}</h3>
            <div className="product-details">
              <span>{labels.color}</span>
              {sale ? <span>{formatEuros(sale.priceCents)}</span> : product.price !== null && <span>{new Intl.NumberFormat(intlLocale, { style: 'currency', currency: 'EUR' }).format(product.price)}</span>}
            </div>
            {sale && (
              <div className="product-buy">
                <div className="size-list" role="group" aria-label={t('shop.sizesAria', { name: labels.name })}>
                  {CART_LIMITS.sizes.map((size) => {
                    const available = availableFor(product, size)
                    return (
                      <button key={size} type="button" disabled={available < 1} aria-pressed={selectedSizes[product.id] === size}
                        onClick={() => setSelectedSizes((current) => ({ ...current, [product.id]: size }))}>{size}</button>
                    )
                  })}
                </div>
                <button type="button" className="commerce-button commerce-button-small" onClick={() => addProduct(product)}>{t('shop.add')}</button>
              </div>
            )}
            {isExternalUrl(product.url) && <a className="text-link" href={product.url} target="_blank" rel="noopener noreferrer">{t('shop.viewPiece')} <span aria-hidden="true">↗</span></a>}
          </div>
        </Reveal>})}
      </div>
      {purchasable && <p className="availability-note shop-note">{t('shop.stripeNote')}</p>}
      {notice && <p className="shop-feedback" role="status">{notice}</p>}
      {purchasable && <p className="shop-cart-link"><Link href="/panier" className="text-link">{t('shop.viewCart')} <span aria-hidden="true">↗</span></Link></p>}
    </section>
  )
}

export default Shop
