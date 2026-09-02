import { useState } from 'react'
import { products, shopContent } from '../../data/products.js'
import { isExternalUrl } from '../../utils/links.js'
import Reveal from '../../components/Reveal.jsx'
import TransitionImage from '../../components/TransitionImage.jsx'

function Shop() {
  const [view, setView] = useState('back')
  const [hoveredProduct, setHoveredProduct] = useState(null)

  function previewOtherSide(event, id) {
    if (event.pointerType === 'mouse' && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      setHoveredProduct(id)
    }
  }
  return (
    <section id="shop" className="shop-section section-shell" aria-labelledby="shop-title">
      <Reveal as="header" className="section-heading"><div><p className="eyebrow section-kicker">{shopContent.label}</p><h2 id="shop-title" className="editorial-title">{shopContent.title}</h2></div>
        <div className="product-view-controls" role="group" aria-label="Vue des vêtements">
          <button type="button" aria-pressed={view === 'front'} onClick={() => setView('front')}>Vue face</button>
          <span aria-hidden="true">/</span>
          <button type="button" aria-pressed={view === 'back'} onClick={() => setView('back')}>Vue dos</button>
        </div>
      </Reveal>
      <div className="products">
        {products.map((product, index) => {
          const displayedView = hoveredProduct === product.id ? (view === 'back' ? 'front' : 'back') : view
          return <Reveal as="article" className="product" key={product.id} delay={(index % 2) * 0.08}
            onPointerEnter={(event) => previewOtherSide(event, product.id)} onPointerLeave={() => setHoveredProduct(null)}>
          <TransitionImage image={{ src: product[displayedView], width: product.width, height: product.height }} className="product-image" alt={`${product.type} ${product.name}, ${product.color.toLowerCase()}, vue ${displayedView === 'front' ? 'de face' : 'de dos'}.`} />
          <div className="product-caption"><p className="eyebrow">{product.type}</p><h3>{product.name}</h3>
            <div className="product-details"><span>{product.color}</span>{product.price !== null && <span>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(product.price)}</span>}</div>
            {isExternalUrl(product.url) && <a className="text-link" href={product.url} target="_blank" rel="noopener noreferrer">Voir la pièce <span aria-hidden="true">↗</span></a>}
          </div>
        </Reveal>})}
      </div>
      <p className="availability-note shop-note">{shopContent.note}</p>
    </section>
  )
}

export default Shop
