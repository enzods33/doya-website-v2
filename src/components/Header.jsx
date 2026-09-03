import { useEffect, useRef, useState } from 'react'
import { m, useReducedMotion } from 'motion/react'
import { navigation, siteContent } from '../data/siteContent.js'
import { commerceConfigured } from '../commerce/config.js'
import { useCart } from '../commerce/CartProvider.jsx'
import { Stars, Wordmark } from './Brand.jsx'
import Link from './Link.jsx'
import { editorialEase } from '../utils/motion.js'
import { useRoute } from '../utils/router.js'

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const dialogRef = useRef(null)
  const triggerRef = useRef(null)
  const bodyOverflowRef = useRef(null)
  const reducedMotion = useReducedMotion()
  const { path } = useRoute()
  const { count } = useCart()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!menuOpen || dialog.open) return
    bodyOverflowRef.current = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
  }, [menuOpen])

  useEffect(() => {
    const dialog = dialogRef.current
    return () => {
      dialog.close()
      if (bodyOverflowRef.current !== null) document.body.style.overflow = bodyOverflowRef.current
    }
  }, [])

  function finishClosingMenu() {
    if (menuOpen || !dialogRef.current.open) return
    dialogRef.current.close()
    document.body.style.overflow = bodyOverflowRef.current ?? ''
    bodyOverflowRef.current = null
    triggerRef.current?.focus({ preventScroll: true })
  }

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)')
    const closeOnDesktop = (event) => { if (event.matches) setMenuOpen(false) }
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [])

  function keepFocusInMenu(event) {
    if (event.key !== 'Tab') return
    const controls = [...dialogRef.current.querySelectorAll('button, a[href]')]
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  function sectionHref(href) {
    return path === '/' ? href : `/${href}`
  }

  const tools = commerceConfigured
    ? [
      { href: '/compte', label: 'Compte' },
      { href: '/panier', label: count ? `Panier (${count})` : 'Panier' },
    ]
    : []

  return (
    <m.header className={`site-header${path === '/' ? '' : ' is-page'}`} initial={reducedMotion ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.7, delay: reducedMotion ? 0 : 0.1, ease: editorialEase }}>
      <Link href={path === '/' ? '#top' : '/'} className="header-brand" aria-label="DOYA — accueil"><Wordmark /></Link>
      <nav className="desktop-navigation" aria-label="Navigation principale">
        {navigation.slice(0, 2).map((item) => <Link key={item.href} href={sectionHref(item.href)}>{item.label}</Link>)}
        <Stars color="black" className="header-stars" />
        {navigation.slice(2).map((item) => <Link key={item.href} href={sectionHref(item.href)}>{item.label}</Link>)}
      </nav>
      {commerceConfigured && (
        <nav className="header-tools" aria-label="Compte et panier">
          <Link href="/compte">Compte</Link>
          <Link href="/panier">Panier{count > 0 && <span className="cart-count">{count}</span>}</Link>
        </nav>
      )}
      <button ref={triggerRef} type="button" className="menu-trigger" aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => setMenuOpen(true)}>
        Menu <span aria-hidden="true">＋</span>
      </button>
      <m.dialog ref={dialogRef} id="mobile-menu" className="mobile-menu" aria-label="Menu DOYA" onKeyDown={keepFocusInMenu}
        onCancel={(event) => { event.preventDefault(); setMenuOpen(false) }} onClose={() => setMenuOpen(false)}
        initial={false} animate={{ opacity: menuOpen ? 1 : 0 }} transition={{ duration: reducedMotion ? 0 : 0.28 }}
        onAnimationComplete={finishClosingMenu}>
        <div className="mobile-menu-top">
          <Wordmark light className="mobile-wordmark" />
          <button type="button" autoFocus onClick={() => setMenuOpen(false)} aria-label="Fermer le menu">Fermer <span aria-hidden="true">×</span></button>
        </div>
        <m.nav aria-label="Navigation mobile" initial={false} animate={menuOpen ? 'open' : 'closed'}
          variants={{ open: { transition: { delayChildren: reducedMotion ? 0 : 0.08, staggerChildren: reducedMotion ? 0 : 0.055 } }, closed: {} }}>
          {[...navigation, ...tools].map((item, index) => (
            <m.a key={item.href} href={item.href.startsWith('#') ? sectionHref(item.href) : item.href} onClick={() => setMenuOpen(false)}
              variants={{ open: { opacity: 1, y: 0 }, closed: { opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 16 } }}
              transition={{ duration: reducedMotion ? 0 : 0.5, ease: editorialEase }}><span>{String(index + 1).padStart(2, '0')}</span>{item.label}</m.a>
          ))}
        </m.nav>
        <div className="mobile-menu-bottom"><Stars /><p>{siteContent.albumTitle}<br />{siteContent.year}</p></div>
      </m.dialog>
    </m.header>
  )
}

export default Header
