import { useEffect, useMemo, useRef, useState } from 'react'
import { adminShopUpload, adminStats } from '../../commerce/admin.js'
import { prepareBioImage } from '../../commerce/prepareBioImage.js'
import { APPAREL_SIZES } from '../../commerce/cartRules.js'
import { products as productCatalog } from '../../data/products.js'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import TransitionImage from '../../components/TransitionImage.jsx'

const TSHIRT_SIZES = APPAREL_SIZES

function formatSizeLabel(size, t) {
  const key = `shop.size.${size}`
  const label = t(key)
  return label === key ? size : label
}

function eurosToCents(value) {
  const normalized = String(value ?? '').trim().replace(',', '.')
  if (!normalized) return null
  const euros = Number(normalized)
  if (!Number.isFinite(euros) || euros < 0) return null
  return Math.round(euros * 100)
}

function centsToEurosInput(cents) {
  if (!Number.isInteger(cents)) return ''
  return (cents / 100).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
}

function emptyNewProduct() {
  return {
    id: '',
    name: '',
    typeSelect: 'tshirt',
    typeCustom: '',
    color: '',
    price: '',
    onSale: true,
    frontFile: null,
    backFile: null,
    frontPreview: '',
    backPreview: '',
    stocks: Object.fromEntries(TSHIRT_SIZES.map((size) => [size, '0'])),
    stockCd: '0',
  }
}

function resolveNewProductType(product) {
  if (product.typeSelect === 'tshirt') return { typeKey: 'tshirt', type: 'T-shirt' }
  if (product.typeSelect === 'cd') return { typeKey: 'cd', type: 'CD' }
  if (product.typeSelect === '__other__') {
    const label = String(product.typeCustom || '').trim()
    return { typeKey: 'other', type: label }
  }
  const label = String(product.typeSelect || '').trim()
  return { typeKey: 'other', type: label }
}

function AdminStocks() {
  const { t } = useI18n()
  const [inventory, setInventory] = useState([])
  const [shipping, setShipping] = useState([])
  const [busy, setBusy] = useState(true)
  const [stockBusy, setStockBusy] = useState(false)
  const [error, setError] = useState('')
  const [stockMessage, setStockMessage] = useState('')
  const [stockDrafts, setStockDrafts] = useState({})
  const [priceDrafts, setPriceDrafts] = useState({})
  const [orderDrafts, setOrderDrafts] = useState({})
  const [shippingDrafts, setShippingDrafts] = useState({})
  const [zoom, setZoom] = useState(null)
  const [zoomViews, setZoomViews] = useState({})
  const [newProduct, setNewProduct] = useState(emptyNewProduct)
  const [creating, setCreating] = useState(false)
  const stockTimersRef = useRef({})
  const priceTimersRef = useRef({})
  const orderTimersRef = useRef({})
  const shippingTimersRef = useRef({})
  const inventoryRef = useRef([])
  const shippingRef = useRef([])
  const productMap = useMemo(() => new Map(productCatalog.map((product) => [product.id, product])), [])
  const customTypes = useMemo(() => {
    const seen = new Set()
    const list = []
    for (const product of inventory) {
      if (product.typeKey !== 'other') continue
      const label = String(product.type || '').trim()
      if (!label) continue
      const key = label.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      list.push(label)
    }
    return list.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  }, [inventory])

  function syncStockDrafts(nextInventory) {
    const drafts = {}
    for (const product of nextInventory ?? []) {
      for (const variant of product.variants ?? []) {
        drafts[variant.variantId] = String(variant.stock)
      }
    }
    setStockDrafts(drafts)
  }

  function syncPriceDrafts(nextInventory) {
    const drafts = {}
    for (const product of nextInventory ?? []) {
      drafts[product.productId] = centsToEurosInput(product.priceCents)
    }
    setPriceDrafts(drafts)
  }

  function syncOrderDrafts(nextInventory) {
    const drafts = {}
    ;(nextInventory ?? []).forEach((product, index) => {
      drafts[product.productId] = String(index + 1)
    })
    setOrderDrafts(drafts)
  }

  function syncShippingDrafts(nextShipping) {
    const drafts = {}
    for (const zone of nextShipping ?? []) {
      drafts[zone.id] = centsToEurosInput(zone.amountCents)
    }
    setShippingDrafts(drafts)
  }

  function applyInventory(nextInventory) {
    setInventory(nextInventory ?? [])
    syncStockDrafts(nextInventory)
    syncPriceDrafts(nextInventory)
    syncOrderDrafts(nextInventory)
  }

  async function loadInventory() {
    setBusy(true)
    setError('')
    try {
      const next = await adminStats('inventory')
      applyInventory(next.inventory ?? [])
      setShipping(next.shipping ?? [])
      syncShippingDrafts(next.shipping ?? [])
    } catch {
      setError(t('admin.error'))
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    loadInventory()
  }, [t])

  useEffect(() => {
    inventoryRef.current = inventory
  }, [inventory])

  useEffect(() => {
    shippingRef.current = shipping
  }, [shipping])

  useEffect(() => {
    if (!zoom) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(event) {
      if (event.key === 'Escape') setZoom(null)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [zoom])

  function mediaFor(product) {
    const local = productMap.get(product.productId)
    const front = product.imageFrontUrl || local?.front || null
    const back = product.imageBackUrl || local?.back || null
    if (!front && !back) return null
    return {
      front,
      back,
      width: product.imageWidth || local?.width || 1200,
      height: product.imageHeight || local?.height || 1200,
      defaultView: front
        ? (product.defaultView || local?.defaultView || 'front')
        : 'back',
      typeKey: product.typeKey || local?.typeKey || 'tshirt',
      colorKey: product.colorKey || local?.colorKey || 'black',
    }
  }

  function findVariant(variantId) {
    for (const product of inventoryRef.current ?? []) {
      for (const variant of product.variants ?? []) {
        if (variant.variantId === variantId) return variant
      }
    }
    return null
  }

  function findProduct(productId) {
    return (inventoryRef.current ?? []).find((row) => row.productId === productId) ?? null
  }

  function scheduleStockSave(variantId, rawValue, delayMs = 900) {
    if (stockTimersRef.current[variantId]) clearTimeout(stockTimersRef.current[variantId])
    const valueSnapshot = rawValue
    stockTimersRef.current[variantId] = window.setTimeout(async () => {
      stockTimersRef.current[variantId] = null
      const meta = findVariant(variantId)
      if (!meta) return
      const trimmed = String(valueSnapshot ?? '').trim()
      if (!trimmed) return
      const nextStock = Number(trimmed)
      if (!Number.isInteger(nextStock) || nextStock < 0) {
        setStockMessage(t('admin.salesStockInvalid'))
        setStockDrafts((current) => ({ ...current, [variantId]: String(meta.stock) }))
        return
      }
      if (nextStock === meta.stock) return
      if (nextStock < meta.reserved) {
        setStockMessage(t('admin.salesStockBelowReserved', { reserved: meta.reserved }))
        setStockDrafts((current) => ({ ...current, [variantId]: String(meta.stock) }))
        return
      }

      setStockMessage('')
      setError('')
      setStockBusy(true)
      try {
        const result = await adminStats('update_stocks', {
          updates: [{ variantId, stock: nextStock }],
        })
        if (result.inventory) applyInventory(result.inventory)
        else await loadInventory()
        setStockMessage(t('admin.salesStockSaved'))
      } catch (caught) {
        const code = caught?.message
        if (code === 'invalid_stock' || code === 'invalid_stock_updates') setStockMessage(t('admin.salesStockInvalid'))
        else if (code === 'stock_below_reserved') setStockMessage(t('admin.salesStockBelowReserved', { reserved: '—' }))
        else setError(t('admin.error'))
        const latest = findVariant(variantId)
        if (latest) setStockDrafts((current) => ({ ...current, [variantId]: String(latest.stock) }))
      } finally {
        setStockBusy(false)
      }
    }, delayMs)
  }

  function schedulePriceSave(productId, rawValue, delayMs = 900) {
    if (priceTimersRef.current[productId]) clearTimeout(priceTimersRef.current[productId])
    const valueSnapshot = rawValue
    priceTimersRef.current[productId] = window.setTimeout(async () => {
      priceTimersRef.current[productId] = null
      const meta = findProduct(productId)
      if (!meta) return
      const priceCents = eurosToCents(valueSnapshot)
      if (priceCents == null || priceCents < 50) {
        setStockMessage(t('admin.stockPriceInvalid'))
        setPriceDrafts((current) => ({ ...current, [productId]: centsToEurosInput(meta.priceCents) }))
        return
      }
      if (priceCents === meta.priceCents) return

      setStockMessage('')
      setError('')
      setStockBusy(true)
      try {
        const result = await adminStats('update_price', {
          productId,
          priceCents,
          onSale: meta.onSale,
        })
        if (result.inventory) applyInventory(result.inventory)
        else await loadInventory()
        setStockMessage(t('admin.stockPriceSaved'))
      } catch {
        setError(t('admin.error'))
        const latest = findProduct(productId)
        if (latest) setPriceDrafts((current) => ({ ...current, [productId]: centsToEurosInput(latest.priceCents) }))
      } finally {
        setStockBusy(false)
      }
    }, delayMs)
  }

  async function toggleVisibility(product) {
    if (!Number.isInteger(product.priceCents) || product.priceCents < 50) {
      setStockMessage(t('admin.stockPriceInvalid'))
      return
    }
    setStockBusy(true)
    setError('')
    try {
      const result = await adminStats('update_price', {
        productId: product.productId,
        priceCents: product.priceCents,
        onSale: !product.onSale,
      })
      if (result.inventory) applyInventory(result.inventory)
      setStockMessage(product.onSale ? t('admin.stockHiddenSaved') : t('admin.stockShownSaved'))
    } catch {
      setError(t('admin.error'))
    } finally {
      setStockBusy(false)
    }
  }

  function scheduleOrderSave(productId, rawValue, delayMs = 700) {
    if (orderTimersRef.current[productId]) clearTimeout(orderTimersRef.current[productId])
    const valueSnapshot = rawValue
    orderTimersRef.current[productId] = window.setTimeout(async () => {
      orderTimersRef.current[productId] = null
      const list = [...inventoryRef.current]
      const from = list.findIndex((row) => row.productId === productId)
      if (from < 0) return

      const trimmed = String(valueSnapshot ?? '').trim()
      const parsed = Number(trimmed)
      if (!trimmed || !Number.isInteger(parsed) || parsed < 1) {
        setStockMessage(t('admin.stockOrderInvalid'))
        setOrderDrafts((current) => ({ ...current, [productId]: String(from + 1) }))
        return
      }

      const to = Math.min(Math.max(parsed, 1), list.length) - 1
      if (to === from) {
        setOrderDrafts((current) => ({ ...current, [productId]: String(from + 1) }))
        return
      }

      const next = [...list]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      const order = next.map((row, i) => ({ productId: row.productId, sortOrder: (i + 1) * 10 }))

      setStockMessage('')
      setError('')
      setStockBusy(true)
      try {
        const result = await adminStats('update_sort_order', { order })
        if (result.inventory) applyInventory(result.inventory)
        else {
          applyInventory(next.map((row, i) => ({ ...row, sortOrder: (i + 1) * 10 })))
        }
        setStockMessage(t('admin.stockOrderSaved'))
      } catch {
        setError(t('admin.error'))
        syncOrderDrafts(inventoryRef.current)
      } finally {
        setStockBusy(false)
      }
    }, delayMs)
  }

  function scheduleShippingSave(zoneId, rawValue, delayMs = 900) {
    if (shippingTimersRef.current[zoneId]) clearTimeout(shippingTimersRef.current[zoneId])
    const valueSnapshot = rawValue
    shippingTimersRef.current[zoneId] = window.setTimeout(async () => {
      shippingTimersRef.current[zoneId] = null
      const zone = shippingRef.current.find((row) => row.id === zoneId)
      if (!zone) return
      const amountCents = eurosToCents(valueSnapshot)
      if (amountCents == null) {
        setStockMessage(t('admin.stockShippingInvalid'))
        setShippingDrafts((current) => ({ ...current, [zoneId]: centsToEurosInput(zone.amountCents) }))
        return
      }
      if (amountCents === zone.amountCents) return

      setStockMessage('')
      setError('')
      setStockBusy(true)
      try {
        const result = await adminStats('update_shipping', {
          shipping: [{ id: zoneId, amountCents }],
        })
        setShipping(result.shipping ?? [])
        syncShippingDrafts(result.shipping ?? [])
        setStockMessage(t('admin.stockShippingSaved'))
      } catch {
        setError(t('admin.error'))
        const latest = shippingRef.current.find((row) => row.id === zoneId)
        if (latest) {
          setShippingDrafts((current) => ({ ...current, [zoneId]: centsToEurosInput(latest.amountCents) }))
        }
      } finally {
        setStockBusy(false)
      }
    }, delayMs)
  }

  async function onPickImage(side, file) {
    if (!file) return
    try {
      const prepared = await prepareBioImage(file)
      const preview = URL.createObjectURL(prepared.file)
      setNewProduct((current) => {
        if (side === 'front' && current.frontPreview) URL.revokeObjectURL(current.frontPreview)
        if (side === 'back' && current.backPreview) URL.revokeObjectURL(current.backPreview)
        return side === 'front'
          ? { ...current, frontFile: prepared, frontPreview: preview }
          : { ...current, backFile: prepared, backPreview: preview }
      })
    } catch {
      setStockMessage(t('admin.stockImageInvalid'))
    }
  }

  async function createProduct() {
    const id = String(newProduct.id || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const name = String(newProduct.name || '').trim()
    const color = String(newProduct.color || '').trim()
    const priceCents = eurosToCents(newProduct.price)
    const { typeKey, type } = resolveNewProductType(newProduct)
    if (!id || !name || priceCents == null || priceCents < 50) {
      setStockMessage(t('admin.stockProductInvalid'))
      return
    }
    if (typeKey === 'other' && (!type || type.length > 40)) {
      setStockMessage(t('admin.stockCreateTypeCustomInvalid'))
      return
    }
    if (!newProduct.frontFile) {
      setStockMessage(t('admin.stockImageRequired'))
      return
    }

    setCreating(true)
    setError('')
    setStockMessage('')
    try {
      const frontUpload = await adminShopUpload(newProduct.frontFile.file, {
        width: newProduct.frontFile.width,
        height: newProduct.frontFile.height,
        side: 'front',
        productId: id,
      })
      let backUrl = null
      let width = frontUpload.width
      let height = frontUpload.height
      if (newProduct.backFile) {
        const backUpload = await adminShopUpload(newProduct.backFile.file, {
          width: newProduct.backFile.width,
          height: newProduct.backFile.height,
          side: 'back',
          productId: id,
        })
        backUrl = backUpload.publicUrl
      }

      const stocks = typeKey === 'cd'
        ? { CD: Number(newProduct.stockCd) || 0 }
        : Object.fromEntries(TSHIRT_SIZES.map((size) => [size, Number(newProduct.stocks[size]) || 0]))

      const maxSort = inventory.reduce((max, row) => Math.max(max, row.sortOrder || 0), 0)
      const result = await adminStats('upsert_product', {
        product: {
          id,
          name,
          typeKey,
          type,
          colorKey: color
            ? color.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'custom'
            : 'default',
          color: color || '',
          priceCents,
          onSale: newProduct.onSale,
          sortOrder: maxSort + 10,
          imageFrontUrl: frontUpload.publicUrl,
          imageBackUrl: backUrl,
          imageWidth: width,
          imageHeight: height,
          stocks,
        },
      })
      if (result.inventory) applyInventory(result.inventory)
      else await loadInventory()
      setNewProduct(emptyNewProduct())
      setStockMessage(t('admin.stockProductCreated', { id }))
    } catch (caught) {
      const code = caught?.message
      if (code === 'invalid_product' || code === 'invalid_product_name') setStockMessage(t('admin.stockProductInvalid'))
      else if (code === 'invalid_product_type') setStockMessage(t('admin.stockCreateTypeCustomInvalid'))
      else if (code === 'invalid_product_image' || code === 'invalid_image_type') setStockMessage(t('admin.stockImageInvalid'))
      else setError(t('admin.error'))
    } finally {
      setCreating(false)
    }
  }

  return (
    <section className="admin-section admin-catalog">
      <header className="admin-section-head">
        <h2>{t('admin.salesStockTitle')}</h2>
        <p>{t('admin.salesStockLead')}</p>
      </header>

      {error ? <p className="admin-error">{error}</p> : null}
      {stockMessage ? <p className="admin-ok" role="status">{stockMessage}</p> : null}

      <div className="admin-catalog-block">
        <h3 className="admin-subtitle admin-subtitle-compact">{t('admin.stockProductsTitle')}</h3>

        {busy ? (
          <div className="admin-list-skeleton" aria-hidden="true">
            <div className="admin-skeleton-line" />
            <div className="admin-skeleton-line" />
          </div>
        ) : inventory.length === 0 ? (
          <p className="admin-empty">{t('admin.salesStockEmpty')}</p>
        ) : (
          <ul className="admin-stock-list">
            {inventory.map((product) => {
              const productMedia = mediaFor(product)
              const view = zoomViews[product.productId] ?? productMedia?.defaultView ?? 'front'
              const labels = {
                type: (product.typeKey === 'other' && product.type)
                  ? product.type
                  : t(`shop.type.${productMedia?.typeKey ?? product.typeKey ?? 'tshirt'}`),
                name: t(`shop.product.${product.productId}`) === `shop.product.${product.productId}`
                  ? product.name
                  : t(`shop.product.${product.productId}`),
                color: product.color || '',
              }
              const alt = t('shop.productAlt', {
                type: labels.type,
                name: labels.name,
                color: String(labels.color).toLowerCase(),
                view: view === 'front' ? t('shop.viewFrontWord') : t('shop.viewBackWord'),
              })
              return (
                <li key={product.productId} className={`admin-stock-card${product.onSale ? '' : ' is-hidden'}`}>
                  <div className="admin-stock-top">
                    {productMedia ? (
                      <button
                        type="button"
                        className="admin-stock-preview"
                        onClick={() => setZoom({ product, productMedia, labels, view })}
                        aria-label={`${t('shop.zoom')} — ${alt}`}
                      >
                        <TransitionImage
                          image={{
                            src: productMedia[view] || productMedia.front || productMedia.back,
                            width: productMedia.width,
                            height: productMedia.height,
                          }}
                          className="admin-stock-image"
                          alt={alt}
                        />
                      </button>
                    ) : (
                      <div className="admin-stock-preview is-empty" aria-hidden="true" />
                    )}
                    <div className="admin-stock-body">
                      <div className="admin-stock-title-row">
                        <label className="admin-stock-order-field">
                          <span>{t('admin.stockOrder')}</span>
                          <input
                            className="admin-control"
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={inventory.length}
                            value={orderDrafts[product.productId] ?? ''}
                            disabled={stockBusy}
                            aria-label={t('admin.stockOrderLabel', { product: product.name })}
                            onChange={(event) => {
                              const nextValue = event.target.value
                              setOrderDrafts((current) => ({ ...current, [product.productId]: nextValue }))
                              scheduleOrderSave(product.productId, nextValue, 700)
                            }}
                            onBlur={(event) => scheduleOrderSave(product.productId, event.target.value, 0)}
                          />
                        </label>
                        <div className="admin-stock-copy">
                          <p className="admin-list-title">{product.name}</p>
                          <p className="admin-list-meta">
                            {[product.type, product.color].filter(Boolean).join(' · ') || '—'}
                          </p>
                        </div>
                      </div>

                      <div className="admin-stock-tools">
                        <label className="admin-stock-amount">
                          <span>{t('admin.stockPrice')}</span>
                          <span className="admin-stock-amount-input">
                            <input
                              className="admin-control"
                              type="text"
                              inputMode="decimal"
                              value={priceDrafts[product.productId] ?? ''}
                              disabled={stockBusy}
                              aria-label={t('admin.stockPriceLabel', { product: product.name })}
                              onChange={(event) => {
                                const nextValue = event.target.value
                                setPriceDrafts((current) => ({ ...current, [product.productId]: nextValue }))
                                schedulePriceSave(product.productId, nextValue, 900)
                              }}
                              onBlur={(event) => schedulePriceSave(product.productId, event.target.value, 0)}
                            />
                            <span aria-hidden="true">€</span>
                          </span>
                        </label>
                        <button
                          type="button"
                          className={`admin-stock-toggle${product.onSale ? ' is-on' : ''}`}
                          disabled={stockBusy}
                          aria-pressed={product.onSale}
                          onClick={() => toggleVisibility(product)}
                        >
                          {product.onSale ? t('admin.stockHide') : t('admin.stockShow')}
                        </button>
                      </div>

                      {productMedia?.front || productMedia?.back ? (
                        <div className="product-view-controls admin-stock-view-controls" role="group" aria-label={t('shop.viewGroup')}>
                          <button
                            type="button"
                            aria-pressed={view === 'front'}
                            disabled={!productMedia.front}
                            onClick={() => setZoomViews((current) => ({ ...current, [product.productId]: 'front' }))}
                          >
                            {t('shop.viewFront')}
                          </button>
                          <span aria-hidden="true">/</span>
                          <button
                            type="button"
                            aria-pressed={view === 'back'}
                            disabled={!productMedia.back}
                            onClick={() => setZoomViews((current) => ({ ...current, [product.productId]: 'back' }))}
                          >
                            {t('shop.viewBack')}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="admin-stock-grid">
                    {product.variants.map((variant) => (
                      <label key={variant.variantId} className="admin-stock-field">
                        <span className="admin-stock-size">
                          {formatSizeLabel(variant.size, t)}
                        </span>
                        <input
                          className="admin-control"
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
                          value={stockDrafts[variant.variantId] ?? ''}
                          disabled={stockBusy}
                          aria-label={t('admin.salesStockQtyLabel', {
                            product: product.name,
                            size: formatSizeLabel(variant.size, t),
                          })}
                          onChange={(event) => {
                            const nextValue = event.target.value
                            setStockDrafts((current) => ({ ...current, [variant.variantId]: nextValue }))
                            scheduleStockSave(variant.variantId, nextValue, 900)
                          }}
                          onBlur={(event) => scheduleStockSave(variant.variantId, event.target.value, 0)}
                        />
                        {variant.reserved > 0 ? (
                          <span className="admin-stock-meta">
                            {t('admin.salesStockReserved', { count: variant.reserved })}
                          </span>
                        ) : (
                          <span className="admin-stock-meta">
                            {t('admin.salesStockAvailable', {
                              count: Math.max(0, Number(stockDrafts[variant.variantId]) || 0),
                            })}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="admin-catalog-block">
        <h3 className="admin-subtitle admin-subtitle-compact">{t('admin.stockCreateTitle')}</h3>
        <p className="admin-hint">{t('admin.stockCreateLead')}</p>
        <div className="admin-form admin-stock-create-form">
          <label>
            <span>{t('admin.stockCreateId')}</span>
            <input
              className="admin-control"
              value={newProduct.id}
              disabled={creating}
              placeholder="nouveau-tee"
              onChange={(event) => setNewProduct((current) => ({ ...current, id: event.target.value }))}
            />
          </label>
          <label>
            <span>{t('admin.stockCreateName')}</span>
            <input
              className="admin-control"
              value={newProduct.name}
              disabled={creating}
              onChange={(event) => setNewProduct((current) => ({ ...current, name: event.target.value }))}
            />
          </label>
          <label>
            <span>{t('admin.stockCreateType')}</span>
            <select
              className="admin-control"
              value={newProduct.typeSelect}
              disabled={creating}
              onChange={(event) => setNewProduct((current) => ({
                ...current,
                typeSelect: event.target.value,
                typeCustom: event.target.value === '__other__' ? current.typeCustom : '',
              }))}
            >
              <option value="tshirt">{t('shop.type.tshirt')}</option>
              <option value="cd">{t('shop.type.cd')}</option>
              {customTypes.map((label) => (
                <option key={label} value={label}>{label}</option>
              ))}
              <option value="__other__">{t('admin.stockCreateTypeOther')}</option>
            </select>
          </label>
          {newProduct.typeSelect === '__other__' ? (
            <label>
              <span>{t('admin.stockCreateTypeCustom')}</span>
              <input
                className="admin-control"
                value={newProduct.typeCustom}
                disabled={creating}
                placeholder={t('admin.stockCreateTypeCustomPlaceholder')}
                maxLength={40}
                onChange={(event) => setNewProduct((current) => ({ ...current, typeCustom: event.target.value }))}
              />
            </label>
          ) : null}
          <label>
            <span>{t('admin.stockCreateColorOptional')}</span>
            <input
              className="admin-control"
              value={newProduct.color}
              disabled={creating}
              placeholder={t('admin.stockCreateColorPlaceholder')}
              onChange={(event) => setNewProduct((current) => ({ ...current, color: event.target.value }))}
            />
          </label>
          <label>
            <span>{t('admin.stockPrice')}</span>
            <input
              className="admin-control"
              type="text"
              inputMode="decimal"
              value={newProduct.price}
              disabled={creating}
              onChange={(event) => setNewProduct((current) => ({ ...current, price: event.target.value }))}
            />
          </label>
          <div className="admin-span-2 admin-stock-create-images">
            <label className="admin-stock-image-pick">
              <span>{t('admin.stockImageFront')}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={creating}
                onChange={(event) => onPickImage('front', event.target.files?.[0])}
              />
              {newProduct.frontPreview ? <img src={newProduct.frontPreview} alt="" /> : null}
            </label>
            <label className="admin-stock-image-pick">
              <span>{t('admin.stockImageBack')}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={creating}
                onChange={(event) => onPickImage('back', event.target.files?.[0])}
              />
              {newProduct.backPreview ? <img src={newProduct.backPreview} alt="" /> : null}
            </label>
          </div>
          <div className="admin-span-2 admin-stock-grid admin-stock-create-stocks">
            {newProduct.typeSelect === 'cd' ? (
              <label className="admin-stock-field">
                <span className="admin-stock-size">{formatSizeLabel('CD', t)}</span>
                <input
                  className="admin-control"
                  type="number"
                  min={0}
                  value={newProduct.stockCd}
                  disabled={creating}
                  onChange={(event) => setNewProduct((current) => ({ ...current, stockCd: event.target.value }))}
                />
              </label>
            ) : (
              TSHIRT_SIZES.map((size) => (
                <label key={size} className="admin-stock-field">
                  <span className="admin-stock-size">{formatSizeLabel(size, t)}</span>
                  <input
                    className="admin-control"
                    type="number"
                    min={0}
                    value={newProduct.stocks[size]}
                    disabled={creating}
                    onChange={(event) => setNewProduct((current) => ({
                      ...current,
                      stocks: { ...current.stocks, [size]: event.target.value },
                    }))}
                  />
                </label>
              ))
            )}
          </div>
          <div className="admin-span-2 admin-promo-create-foot">
            <label className="admin-check admin-check-inline">
              <input
                type="checkbox"
                checked={newProduct.onSale}
                disabled={creating}
                onChange={(event) => setNewProduct((current) => ({ ...current, onSale: event.target.checked }))}
              />
              <span>{t('admin.stockCreateOnSale')}</span>
            </label>
            <button type="button" className="admin-primary" disabled={creating || stockBusy} onClick={createProduct}>
              {creating ? t('admin.saving') : t('admin.stockCreateSubmit')}
            </button>
          </div>
        </div>
      </div>

      <div className="admin-catalog-block">
        <h3 className="admin-subtitle admin-subtitle-compact">{t('admin.stockShippingTitle')}</h3>
        <p className="admin-hint">{t('admin.stockShippingLead')}</p>
        <div className="admin-stock-shipping-grid">
          {shipping.map((zone) => (
            <label key={zone.id} className="admin-stock-amount">
              <span>{t(`cart.zone.${zone.id}`)}</span>
              <span className="admin-stock-amount-input">
                <input
                  className="admin-control"
                  type="text"
                  inputMode="decimal"
                  value={shippingDrafts[zone.id] ?? ''}
                  disabled={stockBusy || busy}
                  aria-label={t('admin.stockShippingAmountLabel', { zone: t(`cart.zone.${zone.id}`) })}
                  onChange={(event) => {
                    const nextValue = event.target.value
                    setShippingDrafts((current) => ({ ...current, [zone.id]: nextValue }))
                    scheduleShippingSave(zone.id, nextValue, 900)
                  }}
                  onBlur={(event) => scheduleShippingSave(zone.id, event.target.value, 0)}
                />
                <span aria-hidden="true">€</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {zoom ? (
        <div className="product-zoom" role="dialog" aria-modal="true" aria-labelledby="admin-stock-zoom-title">
          <button type="button" className="product-zoom-backdrop" aria-label={t('shop.zoomClose')} onClick={() => setZoom(null)} />
          <div className="product-zoom-panel">
            <div className="product-zoom-top">
              <p id="admin-stock-zoom-title" className="product-zoom-title">{zoom.labels.name} · {zoom.labels.color}</p>
              <button type="button" className="product-zoom-close" onClick={() => setZoom(null)}>{t('shop.zoomClose')} <span aria-hidden="true">×</span></button>
            </div>
            <img
              src={zoom.productMedia[zoom.view] || zoom.productMedia.front || zoom.productMedia.back}
              alt={t('shop.productAlt', {
                type: zoom.labels.type,
                name: zoom.labels.name,
                color: String(zoom.labels.color).toLowerCase(),
                view: zoom.view === 'front' ? t('shop.viewFrontWord') : t('shop.viewBackWord'),
              })}
              width={zoom.productMedia.width}
              height={zoom.productMedia.height}
            />
            {zoom.productMedia.front || zoom.productMedia.back ? (
              <div className="product-view-controls product-zoom-controls" role="group" aria-label={t('shop.viewGroup')}>
                <button type="button" aria-pressed={zoom.view === 'front'} disabled={!zoom.productMedia.front} onClick={() => setZoom((current) => ({ ...current, view: 'front' }))}>{t('shop.viewFront')}</button>
                <span aria-hidden="true">/</span>
                <button type="button" aria-pressed={zoom.view === 'back'} disabled={!zoom.productMedia.back} onClick={() => setZoom((current) => ({ ...current, view: 'back' }))}>{t('shop.viewBack')}</button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default AdminStocks
